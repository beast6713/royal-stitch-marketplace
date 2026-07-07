import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyEngagementSignalToCookies, setStoredEngagementSignal } from "@/lib/engagement-store";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity, GUEST_BUYER_COOKIE } from "@/lib/viewer";

export const runtime = "nodejs";

const payloadSchema = z.object({
  productId: z.string().min(1),
  signalType: z.enum([
    "wishlist",
    "save_for_later",
    "back_in_stock",
    "price_drop",
    "recently_viewed"
  ]),
  active: z.boolean()
});

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const response = NextResponse.json({ ok: true });
  const viewer = await getViewerIdentity(request.cookies);

  if (viewer.guestCookieValue) {
    response.cookies.set(GUEST_BUYER_COOKIE, viewer.guestCookieValue, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax"
    });
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    logWarn("api.engagement.bad_request", "Invalid engagement payload received.", {
      ...requestContext,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid engagement payload." }, { status: 400 });
  }

  try {
    await setStoredEngagementSignal({
      buyerId: viewer.buyerId,
      productId: payload.productId,
      signalType: payload.signalType,
      active: payload.active
    });
    applyEngagementSignalToCookies(
      {
        get: (name) => request.cookies.get(name) ?? response.cookies.get(name),
        set: (name, value, options) => {
          response.cookies.set(name, value, options);
        }
      },
      payload.signalType,
      payload.productId,
      payload.active
    );
    await recordTelemetryEvent({
      buyerId: viewer.buyerId,
      event: `${payload.signalType}.persisted`,
      page: request.nextUrl.pathname,
      productId: payload.productId,
      properties: {
        active: payload.active
      }
    });
    logInfo("api.engagement.updated", "Updated buyer engagement signal.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      productId: payload.productId,
      signalType: payload.signalType,
      active: payload.active
    });
    return response;
  } catch (error) {
    logError("api.engagement.failed", "Failed to update buyer engagement signal.", error, {
      ...requestContext,
      buyerId: viewer.buyerId
    });
    return NextResponse.json({ error: "Unable to update engagement right now." }, { status: 500 });
  }
}
