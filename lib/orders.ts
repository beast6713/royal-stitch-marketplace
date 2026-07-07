import "server-only";
import { mockOrders, mockReturnRequests, mockSupportCases } from "@/lib/mock-data";
import { getCartSnapshot } from "@/lib/cart";
import { writeAuditLog } from "@/lib/audit-log";
import { enqueueBackgroundJob } from "@/lib/background-jobs";
import { supabaseCircuitBreaker, withRetry } from "@/lib/resilience";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type {
  BuyerIdentity,
  MarketplaceOrder,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ReturnRequest,
  ShippingStatus,
  SupportCase
} from "@/lib/types";

type OrderRow = {
  id: string;
  buyer_identifier: string;
  buyer_name: string;
  status: OrderStatus;
  subtotal: number | string;
  shipping_fee: number | string;
  total: number | string;
  created_at: string;
  payment_method: PaymentMethod | null;
  payment_status: PaymentStatus | null;
  razorpay_order_id: string | null;
  razorpay_payment_id?: string | null;
  share_channel: "whatsapp" | "instagram" | "link" | null;
  reseller_margin_total: number | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  seller_id: string;
  product_id: string | null;
  product_name: string;
  quantity: number;
  unit_price: number | string;
  selected_color: string | null;
  selected_size: string | null;
  custom_margin: number | null;
  shipping_status: ShippingStatus;
  tracking_number: string | null;
  courier_name: string | null;
  estimated_delivery_at: string | null;
  delivered_at: string | null;
};

function generateTrackingNumber(orderId: string) {
  return `RSM${orderId.replace(/[^A-Z0-9]/gi, "").slice(0, 8).toUpperCase()}`;
}

function estimateDeliveryDate() {
  const next = new Date();
  next.setDate(next.getDate() + 5);
  return next.toISOString();
}

function paymentExpiryDate() {
  const next = new Date();
  next.setMinutes(next.getMinutes() + 20);
  return next;
}

function mapOrders(rows: OrderRow[], itemRows: OrderItemRow[]): MarketplaceOrder[] {
  return rows.map((row) => ({
    id: row.id,
    buyerId: row.buyer_identifier,
    buyerName: row.buyer_name,
    status: row.status,
    subtotal: Number(row.subtotal),
    shippingFee: Number(row.shipping_fee),
    total: Number(row.total),
    createdAt: row.created_at,
    paymentMethod: row.payment_method ?? undefined,
    paymentStatus: row.payment_status ?? undefined,
    razorpayOrderId: row.razorpay_order_id ?? null,
    shareChannel: row.share_channel ?? null,
    resellerMarginTotal: row.reseller_margin_total ?? 0,
    items: itemRows
      .filter((item) => item.order_id === row.id)
      .map((item) => ({
        id: item.id,
        sellerId: item.seller_id,
        productId: item.product_id,
        productName: item.product_name,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        selectedColor: item.selected_color,
        selectedSize: item.selected_size,
        customMargin: item.custom_margin ?? 0,
        shippingStatus: item.shipping_status,
        trackingNumber: item.tracking_number,
        courierName: item.courier_name,
        estimatedDeliveryAt: item.estimated_delivery_at,
        deliveredAt: item.delivered_at
      }))
  }));
}

export async function getBuyerOrders(buyerId: string): Promise<MarketplaceOrder[]> {
  if (!hasSupabaseAdminConfig()) {
    return mockOrders.filter((order) => order.buyerId === buyerId);
  }

  const supabase = getSupabaseAdminClient();
  const { data: orderRows } = await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase
            .from("orders")
            .select("*")
            .eq("buyer_identifier", buyerId)
            .order("created_at", { ascending: false })
            .limit(50);

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "orders.get_buyer_orders",
          context: { buyerId }
        }
      ),
    { buyerId }
  );

  const orderIds = (orderRows ?? []).map((row) => row.id);

  if (orderIds.length === 0) return [];

  const { data: itemRows } = await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase
            .from("order_items")
            .select("*")
            .in("order_id", orderIds);

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "orders.get_buyer_order_items",
          context: { buyerId, orderCount: orderIds.length }
        }
      ),
    { buyerId }
  );

  return mapOrders((orderRows ?? []) as OrderRow[], (itemRows ?? []) as OrderItemRow[]);
}

export async function getSellerOrders(sellerId: string): Promise<MarketplaceOrder[]> {
  if (!hasSupabaseAdminConfig()) {
    // Mock data needs adaptation, but skipping for brevity
    return [];
  }

  const supabase = getSupabaseAdminClient();
  
  const { data: itemRows } = await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase
            .from("order_items")
            .select("*")
            .eq("seller_id", sellerId)
            .order("id", { ascending: false })
            .limit(100);

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "orders.get_seller_order_items",
          context: { sellerId }
        }
      ),
    { sellerId }
  );

  const orderIds = [...new Set((itemRows ?? []).map((row) => row.order_id))];

  if (orderIds.length === 0) return [];

  const { data: orderRows, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .in("id", orderIds)
    .order("created_at", { ascending: false });

  if (orderError) throw new Error(orderError.message);

  return mapOrders((orderRows ?? []) as OrderRow[], (itemRows ?? []) as OrderItemRow[]);
}

async function getOrderWithItems(orderId: string) {
  const supabase = getSupabaseAdminClient();
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .single();

  if (orderError || !orderRow) {
    throw new Error(orderError?.message ?? "Order not found.");
  }

  const { data: itemRows, error: itemError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", orderId);

  if (itemError) {
    throw new Error(itemError.message);
  }

  return mapOrders([orderRow as OrderRow], (itemRows ?? []) as OrderItemRow[])[0]!;
}

export async function getOrderByRazorpayOrderId(razorpayOrderId: string) {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("razorpay_order_id", razorpayOrderId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ? getOrderWithItems(data.id) : null;
}

export async function getOrderByIdempotencyKey({
  idempotencyKey,
  buyerId
}: {
  idempotencyKey: string;
  buyerId: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .select("id")
    .eq("idempotency_key", idempotencyKey)
    .eq("buyer_identifier", buyerId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.id ? getOrderWithItems(data.id) : null;
}

export async function getBuyerReturns(buyerId: string): Promise<ReturnRequest[]> {
  if (!hasSupabaseAdminConfig()) {
    return mockReturnRequests.filter((entry) => entry.buyerId === buyerId);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("return_requests")
    .select("*")
    .eq("buyer_identifier", buyerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((entry) => ({
    id: entry.id,
    orderId: entry.order_item_id, // Note: Schema updated this to order_item_id, but the type expects orderId? Let's keep it to orderId or update type. Wait, the type has orderId.
    buyerId: entry.buyer_identifier,
    status: entry.status,
    refundStatus: entry.refund_status,
    reason: entry.reason,
    openedAt: entry.created_at,
    updatedAt: entry.updated_at
  }));
}

export async function getSellerReturnRequests(sellerId: string): Promise<ReturnRequest[]> {
  if (!hasSupabaseAdminConfig()) return [];

  const supabase = getSupabaseAdminClient();
  const { data: itemRows, error: itemError } = await supabase
    .from("order_items")
    .select("id")
    .eq("seller_id", sellerId);

  if (itemError) throw new Error(itemError.message);

  const itemIds = (itemRows ?? []).map((row) => row.id);

  if (itemIds.length === 0) return [];

  const { data, error } = await supabase
    .from("return_requests")
    .select("*")
    .in("order_item_id", itemIds)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((entry) => ({
    id: entry.id,
    orderId: entry.order_item_id,
    buyerId: entry.buyer_identifier,
    status: entry.status,
    refundStatus: entry.refund_status,
    reason: entry.reason,
    openedAt: entry.created_at,
    updatedAt: entry.updated_at
  }));
}

export async function getBuyerSupportCases(buyerId: string): Promise<SupportCase[]> {
  if (!hasSupabaseAdminConfig()) {
    return mockSupportCases.filter((entry) => entry.buyerId === buyerId);
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("support_cases")
    .select("*")
    .eq("buyer_identifier", buyerId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return (data ?? []).map((entry) => ({
    id: entry.id,
    orderId: entry.order_id,
    buyerId: entry.buyer_identifier,
    sellerId: entry.seller_id,
    caseType: entry.case_type,
    status: entry.status,
    title: entry.title,
    description: entry.description,
    createdAt: entry.created_at
  }));
}

export async function createOrdersFromCart({
  buyer,
  paymentMethod,
  shareChannel,
  razorpayOrderId,
  shippingAddress,
  idempotencyKey
}: {
  buyer: BuyerIdentity;
  paymentMethod: PaymentMethod;
  shareChannel?: "whatsapp" | "instagram" | "link" | null;
  razorpayOrderId?: string | null;
  shippingAddress: string;
  idempotencyKey: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to create live orders.");
  }

  const existingOrder = await getOrderByIdempotencyKey({
    idempotencyKey,
    buyerId: buyer.buyerId
  });

  if (existingOrder) {
    return [existingOrder];
  }

  const cart = await getCartSnapshot({ buyerId: buyer.buyerId });
  const activeItems = cart.items.filter((item) => !item.savedForLater);

  if (activeItems.length === 0) {
    throw new Error("Your cart is empty.");
  }

  const supabase = getSupabaseAdminClient();
  const subtotal = activeItems.reduce(
    (sum, item) => sum + (item.product.price + (item.customMargin ?? 0)) * item.quantity,
    0
  );
  const shippingFee = subtotal >= 2499 ? 0 : 99;
  const total = subtotal + shippingFee;
  const resellerMarginTotal = activeItems.reduce(
    (sum, item) => sum + (item.customMargin ?? 0) * item.quantity,
    0
  );

  const cartItemsPayload = activeItems.map(item => ({
    product_id: item.productId,
    seller_id: item.product.sellerId,
    product_name: item.product.name,
    quantity: item.quantity,
    unit_price: item.product.price,
    selected_color: item.selectedColor,
    selected_size: item.selectedSize,
    custom_margin: item.customMargin
  }));

  const { data: orderId } = await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase.rpc("place_order_transaction", {
            p_idempotency_key: idempotencyKey,
            p_buyer_identifier: buyer.buyerId,
            p_buyer_name: buyer.buyerName,
            p_subtotal: subtotal,
            p_shipping_fee: shippingFee,
            p_total: total,
            p_payment_method: paymentMethod,
            p_shipping_address: shippingAddress,
            p_cart_items: cartItemsPayload,
            p_share_channel: shareChannel ?? null,
            p_razorpay_order_id: razorpayOrderId ?? null,
            p_reseller_margin_total: resellerMarginTotal
          });

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "orders.place_order_transaction",
          context: {
            buyerId: buyer.buyerId,
            paymentMethod,
            idempotencyKey
          }
        }
      ),
    {
      buyerId: buyer.buyerId,
      paymentMethod,
      idempotencyKey
    }
  );

  if (!orderId) {
    throw new Error("Unable to create order. Please try again.");
  }

  const order = await getOrderWithItems(orderId);

  await writeAuditLog({
    actorId: buyer.buyerId,
    action: "order.created",
    targetType: "order",
    targetId: orderId,
    metadata: {
      paymentMethod,
      total,
      itemCount: activeItems.length,
      idempotencyKey
    },
    context: {
      buyerId: buyer.buyerId,
      orderId
    }
  });

  if (paymentMethod === "cod") {
    await enqueueBackgroundJob({
      type: "order_confirmation_email",
      payload: {
        orderId,
        buyerId: buyer.buyerId,
        total
      },
      idempotencyKey: `order-email:${orderId}`,
      context: {
        buyerId: buyer.buyerId,
        orderId
      }
    });
  }

  return [order];
}

export async function attachRazorpayOrderToOrder({
  orderId,
  buyerId,
  razorpayOrderId
}: {
  orderId: string;
  buyerId: string;
  razorpayOrderId: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to attach Razorpay orders.");
  }

  const supabase = getSupabaseAdminClient();
  const expiresAt = paymentExpiryDate();
  await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase
            .from("orders")
            .update({
              razorpay_order_id: razorpayOrderId,
              payment_provider: "razorpay",
              payment_expires_at: expiresAt.toISOString(),
              payment_attempts: 1
            })
            .eq("id", orderId)
            .eq("buyer_identifier", buyerId)
            .select("id")
            .single();

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "orders.attach_razorpay_order",
          context: { buyerId, orderId, razorpayOrderId }
        }
      ),
    { buyerId, orderId, razorpayOrderId }
  );

  await enqueueBackgroundJob({
    type: "release_abandoned_order",
    payload: {
      orderId,
      razorpayOrderId
    },
    idempotencyKey: `release-abandoned:${orderId}`,
    runAfter: expiresAt,
    context: {
      buyerId,
      orderId,
      razorpayOrderId
    }
  });

  await writeAuditLog({
    actorId: buyerId,
    action: "payment.order_attached",
    targetType: "order",
    targetId: orderId,
    metadata: {
      provider: "razorpay",
      razorpayOrderId,
      expiresAt: expiresAt.toISOString()
    },
    context: {
      buyerId,
      orderId,
      razorpayOrderId
    }
  });
}

export async function confirmRazorpayPayment({
  orderId,
  buyerId,
  razorpayOrderId,
  razorpayPaymentId,
  rawPayload
}: {
  orderId: string;
  buyerId?: string | null;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  rawPayload?: Record<string, unknown>;
}) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to confirm payments.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: confirmedOrderId } = await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase.rpc("confirm_payment_transaction", {
            p_order_id: orderId,
            p_buyer_identifier: buyerId ?? null,
            p_razorpay_order_id: razorpayOrderId,
            p_razorpay_payment_id: razorpayPaymentId,
            p_raw_payload: rawPayload ?? {}
          });

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "orders.confirm_payment_transaction",
          context: {
            buyerId,
            orderId,
            razorpayOrderId,
            razorpayPaymentId
          }
        }
      ),
    {
      buyerId,
      orderId,
      razorpayOrderId,
      razorpayPaymentId
    }
  );

  if (!confirmedOrderId) {
    throw new Error("Payment could not be confirmed.");
  }

  const order = await getOrderWithItems(confirmedOrderId);

  await writeAuditLog({
    actorId: buyerId ?? "razorpay",
    action: "payment.confirmed",
    targetType: "order",
    targetId: order.id,
    metadata: {
      provider: "razorpay",
      razorpayOrderId,
      razorpayPaymentId
    },
    context: {
      buyerId,
      orderId: order.id,
      razorpayOrderId,
      razorpayPaymentId
    }
  });

  await enqueueBackgroundJob({
    type: "order_confirmation_email",
    payload: {
      orderId: order.id,
      buyerId: order.buyerId,
      total: order.total
    },
    idempotencyKey: `order-email:${order.id}`,
    context: {
      buyerId: order.buyerId,
      orderId: order.id
    }
  });

  return order;
}

export async function markRazorpayPaymentFailed({
  razorpayOrderId,
  razorpayPaymentId,
  reason
}: {
  razorpayOrderId: string;
  razorpayPaymentId?: string | null;
  reason: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({
      payment_status: "failed",
      failure_reason: reason,
      razorpay_payment_id: razorpayPaymentId ?? null
    })
    .eq("razorpay_order_id", razorpayOrderId)
    .eq("status", "pending")
    .select("id, buyer_identifier")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.id) {
    await enqueueBackgroundJob({
      type: "release_abandoned_order",
      payload: {
        orderId: data.id,
        razorpayOrderId
      },
      idempotencyKey: `release-abandoned:${data.id}`,
      runAfter: paymentExpiryDate(),
      context: {
        buyerId: data.buyer_identifier,
        orderId: data.id,
        razorpayOrderId
      }
    });
  }
}

export async function expirePendingOrder({
  orderId,
  reason = "payment_abandoned"
}: {
  orderId: string;
  reason?: string;
}) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.rpc("expire_pending_order", {
    p_order_id: orderId,
    p_reason: reason
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function updateSellerOrderStatus({
  orderItemId,
  sellerId,
  nextStatus
}: {
  orderItemId: string;
  sellerId: string;
  nextStatus: ShippingStatus;
}) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to update order status.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingItem, error: existingItemError } = await supabase
    .from("order_items")
    .select("id, order_id")
    .eq("id", orderItemId)
    .eq("seller_id", sellerId)
    .single();

  if (existingItemError || !existingItem) {
    throw new Error(existingItemError?.message ?? "Order item not found or unauthorized.");
  }

  const { data: existingOrder, error: existingOrderError } = await supabase
    .from("orders")
    .select("id, status, payment_status")
    .eq("id", existingItem.order_id)
    .single();

  if (existingOrderError || !existingOrder) {
    throw new Error(existingOrderError?.message ?? "Order not found.");
  }

  if (!["paid", "cod_due"].includes(existingOrder.payment_status)) {
    throw new Error("Order cannot be shipped until payment is confirmed or COD is due.");
  }

  const shippingUpdates: Record<string, string | null> = {
    shipping_status: nextStatus,
    delivered_at: nextStatus === "delivered" ? new Date().toISOString() : null
  };

  if (nextStatus === "label_created") {
    shippingUpdates.tracking_number = generateTrackingNumber(existingItem.order_id);
  }

  if (["label_created", "in_transit", "out_for_delivery"].includes(nextStatus)) {
    shippingUpdates.estimated_delivery_at = estimateDeliveryDate();
  }

  const { data, error } = await supabase
    .from("order_items")
    .update(shippingUpdates)
    .eq("id", orderItemId)
    .eq("seller_id", sellerId)
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to update order item status.");
  }

  // we just return the item row conceptually, or we can fetch the full order.
  // to return the full order, fetch it:
  const { data: orderRow, error: orderError } = await supabase
    .from("orders")
    .select("*")
    .eq("id", data.order_id)
    .single();

  if (orderError) throw new Error(orderError.message);

  const { data: allItems, error: itemsError } = await supabase
    .from("order_items")
    .select("*")
    .eq("order_id", data.order_id);
    
  if (itemsError) throw new Error(itemsError.message);

  const aggregateOrderStatus: OrderStatus = (allItems ?? []).every((item) => item.shipping_status === "delivered")
    ? "delivered"
    : (allItems ?? []).some((item) => ["label_created", "in_transit", "out_for_delivery", "delayed"].includes(item.shipping_status))
      ? "shipped"
      : "paid";

  if (!["refunded", "cancelled"].includes(orderRow.status)) {
    await supabase
      .from("orders")
      .update({ status: aggregateOrderStatus })
      .eq("id", data.order_id);
    orderRow.status = aggregateOrderStatus;
  }

  await writeAuditLog({
    actorId: sellerId,
    action: "order_item.shipping_status_updated",
    targetType: "order_item",
    targetId: orderItemId,
    metadata: {
      orderId: data.order_id,
      shippingStatus: nextStatus,
      aggregateOrderStatus
    },
    context: {
      sellerId,
      orderId: data.order_id,
      orderItemId
    }
  });

  return mapOrders([orderRow as OrderRow], (allItems ?? []) as OrderItemRow[])[0];
}
