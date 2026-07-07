import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCartSnapshot } from "@/lib/cart";
import { createOrdersFromCart } from "@/lib/orders";
import { randomUUID } from "crypto";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity, GUEST_BUYER_COOKIE } from "@/lib/viewer";

export const runtime = "nodejs";

const payloadSchema = z.object({
  paymentMethod: z.enum(["cod", "upi", "card"]),
  shareChannel: z.enum(["whatsapp", "instagram", "link"]).nullable().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  idempotencyKey: z.string().min(8).max(120).optional(),
  shippingAddress: z.string().min(10, "A full shipping address is required")
});

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);
  const rateLimit = checkRateLimit({
    key: `checkout:${viewer.buyerId}:${getClientIp(request.headers)}`,
    limit: 10,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    logWarn("api.checkout.bad_request", "Invalid checkout payload received.", {
      ...requestContext,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid checkout payload." }, { status: 400 });
  }

  if (payload.paymentMethod !== "cod") {
    logWarn("api.checkout.prepaid_legacy_blocked", "Prepaid checkout attempted on the COD endpoint.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      paymentMethod: payload.paymentMethod
    });
    return NextResponse.json(
      {
        error: "Use /api/payments/razorpay/order and /api/payments/razorpay/verify for prepaid checkout."
      },
      { status: 409 }
    );
  }

  try {
    const cart = await getCartSnapshot({
      buyerId: viewer.buyerId,
      cookieStore: request.cookies
    });
    const sellerCheckoutState = new Map<
      string,
      { itemCount: number; total: number }
    >();

    for (const item of cart.items) {
      const current = sellerCheckoutState.get(item.product.sellerId) ?? {
        itemCount: 0,
        total: 0
      };
      sellerCheckoutState.set(item.product.sellerId, {
        itemCount: current.itemCount + item.quantity,
        total:
          current.total + (item.product.price + (item.customMargin ?? 0)) * item.quantity
      });
    }

    for (const [sellerId, sellerCheckout] of sellerCheckoutState) {
      await recordTelemetryEvent({
        buyerId: viewer.buyerId,
        sellerId,
        event: "checkout.started",
        page: request.nextUrl.pathname,
        properties: {
          paymentMethod: payload.paymentMethod,
          itemCount: sellerCheckout.itemCount,
          total: sellerCheckout.total
        }
      });
    }

    const orders = await createOrdersFromCart({
      buyer: viewer,
      paymentMethod: payload.paymentMethod,
      shareChannel: payload.shareChannel ?? null,
      razorpayOrderId: null,
      shippingAddress: payload.shippingAddress,
      idempotencyKey:
        request.headers.get("idempotency-key") ?? payload.idempotencyKey ?? randomUUID()
    });

    for (const order of orders) {
      for (const item of order.items) {
        await recordTelemetryEvent({
          buyerId: viewer.buyerId,
          sellerId: item.sellerId,
          orderId: order.id,
          event: "purchase.completed",
          page: request.nextUrl.pathname,
          productId: item.productId,
          properties: {
            paymentMethod: payload.paymentMethod,
            total: item.unitPrice * item.quantity + (item.customMargin ?? 0) * item.quantity
          }
        });
      }
    }

    logInfo("api.checkout.completed", "Marketplace checkout completed.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      orderCount: orders.length
    });

    const response = NextResponse.json({ orders }, { status: 201 });

    if (viewer.guestCookieValue) {
      response.cookies.set(GUEST_BUYER_COOKIE, viewer.guestCookieValue, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax"
      });
    }

    revalidatePath("/");
    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath("/seller");
    revalidatePath("/account");
    return response;
  } catch (error) {
    logError("api.checkout.failed", "Marketplace checkout failed.", error, {
      ...requestContext,
      buyerId: viewer.buyerId
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to complete checkout."
      },
      { status: 500 }
    );
  }
}
