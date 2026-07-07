import "server-only";
import { logInfo, logWarn } from "@/lib/logger";
import { supabaseCircuitBreaker, withRetry } from "@/lib/resilience";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { AnalyticsSummary, TelemetryEvent } from "@/lib/types";

type TelemetryPayload = {
  buyerId?: string | null;
  sellerId?: string | null;
  orderId?: string | null;
  event: string;
  page: string;
  productId?: string | null;
  properties?: Record<string, string | number | boolean | null>;
};

type TelemetryRow = {
  id: string;
  buyer_identifier: string | null;
  seller_id: string | null;
  order_id: string | null;
  event_name: string;
  page: string;
  product_id: string | null;
  properties: Record<string, string | number | boolean | null> | null;
  created_at: string;
};

function emptyAnalyticsSummary(): AnalyticsSummary {
  return {
    conversionRate: 0,
    repeatPurchaseRate: 0,
    averageOrderValue: 0,
    dropOffByStep: [],
    repeatPurchaseCohorts: [],
    shareToOrderConversionRate: 0,
    telemetryEventsCaptured: 0
  };
}

export async function recordTelemetryEvent(payload: TelemetryPayload) {
  logInfo("telemetry.event.persist", "Persisting marketplace telemetry event.", payload);

  if (!hasSupabaseAdminConfig()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  try {
    await supabaseCircuitBreaker.execute(
      () =>
        withRetry(
          async () => {
            const { error } = await supabase.from("telemetry_events").insert({
              buyer_identifier: payload.buyerId ?? null,
              seller_id: payload.sellerId ?? null,
              order_id: payload.orderId ?? null,
              event_name: payload.event,
              page: payload.page,
              product_id: payload.productId ?? null,
              properties: payload.properties ?? {}
            });

            if (error) {
              throw error;
            }
          },
          {
            operationName: "telemetry_events.insert",
            context: {
              buyerId: payload.buyerId,
              sellerId: payload.sellerId,
              event: payload.event
            }
          }
        ),
      {
        buyerId: payload.buyerId,
        sellerId: payload.sellerId,
        event: payload.event
      }
    );
  } catch (error) {
    logWarn("telemetry.event.drop", "Telemetry event could not be persisted.", {
      buyerId: payload.buyerId,
      sellerId: payload.sellerId,
      event: payload.event,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function getTelemetryEventsForSeller(sellerId: string): Promise<TelemetryEvent[]> {
  if (!hasSupabaseAdminConfig()) {
    return [];
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("telemetry_events")
    .select(
      "id, buyer_identifier, seller_id, order_id, event_name, page, product_id, properties, created_at"
    )
    .eq("seller_id", sellerId)
    .order("created_at", { ascending: false })
    .limit(1000);

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as TelemetryRow[]).map((row) => ({
    id: row.id,
    buyerId: row.buyer_identifier,
    event: row.event_name,
    page: row.page,
    productId: row.product_id ?? null,
    properties: row.properties ?? undefined,
    createdAt: row.created_at
  }));
}

export async function buildTelemetryAnalytics({
  sellerId,
  averageOrderValue,
  repeatPurchaseRate,
  totalOrders
}: {
  sellerId: string;
  averageOrderValue: number;
  repeatPurchaseRate: number;
  totalOrders: number;
}): Promise<AnalyticsSummary> {
  const events = await getTelemetryEventsForSeller(sellerId);

  if (events.length === 0) {
    return {
      ...emptyAnalyticsSummary(),
      averageOrderValue,
      repeatPurchaseRate
    };
  }

  const countByEvent = new Map<string, number>();

  for (const event of events) {
    countByEvent.set(event.event, (countByEvent.get(event.event) ?? 0) + 1);
  }

  const galleryViews = countByEvent.get("page.viewed") ?? 0;
  const productViews = countByEvent.get("product.viewed") ?? 0;
  const cartAdds = countByEvent.get("cart.added") ?? 0;
  const checkoutStarts = countByEvent.get("checkout.started") ?? 0;
  const purchases = countByEvent.get("checkout.completed") ?? totalOrders;
  const shares = countByEvent.get("share.created") ?? 0;
  const listingViews = Math.max(productViews, galleryViews);

  const safeDrop = (from: number, to: number) => {
    if (from <= 0) {
      return 0;
    }

    return Number((((from - to) / from) * 100).toFixed(1));
  };

  return {
    conversionRate:
      listingViews > 0 ? Number(((purchases / listingViews) * 100).toFixed(1)) : 0,
    repeatPurchaseRate,
    averageOrderValue,
    dropOffByStep: [
      { label: "Listing views", users: listingViews, dropOffRate: 0 },
      {
        label: "Add to cart",
        users: cartAdds,
        dropOffRate: safeDrop(listingViews, cartAdds)
      },
      {
        label: "Checkout",
        users: checkoutStarts,
        dropOffRate: safeDrop(cartAdds, checkoutStarts)
      },
      {
        label: "Purchase",
        users: purchases,
        dropOffRate: safeDrop(checkoutStarts, purchases)
      }
    ],
    repeatPurchaseCohorts: [
      { label: "Captured telemetry", value: `${events.length} events` },
      { label: "Top acquisition action", value: shares > 0 ? "Share-led discovery" : "Direct product visits" },
      {
        label: "Checkout funnel mode",
        value: checkoutStarts > 0 ? "Live checkout with seller split orders" : "Discovery-heavy browsing"
      }
    ],
    shareToOrderConversionRate: shares > 0 ? Number(((purchases / shares) * 100).toFixed(1)) : 0,
    telemetryEventsCaptured: events.length
  };
}
