import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRequestContext, logInfo, logWarn } from "@/lib/logger";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity, GUEST_BUYER_COOKIE } from "@/lib/viewer";

export const runtime = "nodejs";

const eventSchema = z.object({
  event: z.enum([
    "page.viewed",
    "product.viewed",
    "cart.added",
    "cart.removed",
    "checkout.started",
    "purchase.completed",
    "share.created",
    "wishlist.persisted",
    "save_for_later.persisted",
    "back_in_stock.persisted",
    "price_drop.persisted",
    "recently_viewed.persisted"
  ]),
  page: z.string().min(1).max(200),
  productId: z.string().max(120).optional(),
  sellerId: z.string().max(120).optional(),
  orderId: z.string().max(120).optional(),
  properties: z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
    .optional()
});

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);
  const rateLimit = checkRateLimit({
    key: `telemetry:${viewer.buyerId}:${getClientIp(request.headers)}`,
    limit: 120,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  try {
    const payload = eventSchema.parse(await request.json());

    await recordTelemetryEvent({
      buyerId: viewer.buyerId,
      sellerId: payload.sellerId,
      orderId: payload.orderId,
      event: payload.event,
      page: payload.page,
      productId: payload.productId,
      properties: payload.properties
    });

    logInfo("telemetry.event", "Marketplace telemetry event received.", {
      ...requestContext,
      ...payload
    });

    const response = NextResponse.json({ ok: true }, { status: 202 });

    if (viewer.guestCookieValue) {
      response.cookies.set(GUEST_BUYER_COOKIE, viewer.guestCookieValue, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax"
      });
    }

    return response;
  } catch (error) {
    logWarn("telemetry.invalid", "Ignored an invalid telemetry payload.", {
      ...requestContext,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });

    return NextResponse.json({ error: "Invalid telemetry payload." }, { status: 400 });
  }
}
