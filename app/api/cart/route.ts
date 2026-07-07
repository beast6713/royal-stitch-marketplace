import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { applyCartMutationToCookie, getCartSnapshot, upsertCartItem } from "@/lib/cart";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { getProductsByIds } from "@/lib/products";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity, GUEST_BUYER_COOKIE } from "@/lib/viewer";

export const runtime = "nodejs";

const payloadSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().min(0).max(20),
  selectedColor: z.string().max(60).nullable().optional(),
  selectedSize: z.string().max(60).nullable().optional(),
  customMargin: z.number().min(0).max(100000).optional(),
  savedForLater: z.boolean().optional()
});

function withGuestCookie(
  response: NextResponse,
  guestCookieValue?: string
) {
  if (guestCookieValue) {
    response.cookies.set(GUEST_BUYER_COOKIE, guestCookieValue, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax"
    });
  }

  return response;
}

export async function GET(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);

  try {
    const cart = await getCartSnapshot({
      buyerId: viewer.buyerId,
      cookieStore: request.cookies
    });

    return withGuestCookie(NextResponse.json({ cart }), viewer.guestCookieValue);
  } catch (error) {
    logError("api.cart.get.failed", "Failed to load the marketplace cart.", error, {
      ...requestContext,
      buyerId: viewer.buyerId
    });
    return NextResponse.json({ error: "Unable to load the cart." }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);
  const rateLimit = checkRateLimit({
    key: `cart:${viewer.buyerId}:${getClientIp(request.headers)}`,
    limit: 40,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    logWarn("api.cart.bad_request", "Invalid cart payload received.", {
      ...requestContext,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid cart payload." }, { status: 400 });
  }

  const response = NextResponse.json({ ok: true });

  try {
    await upsertCartItem({
      buyerId: viewer.buyerId,
      productId: payload.productId,
      quantity: payload.quantity,
      selectedColor: payload.selectedColor ?? null,
      selectedSize: payload.selectedSize ?? null,
      customMargin: payload.customMargin ?? 0,
      savedForLater: payload.savedForLater ?? false
    });
    const [product] = await getProductsByIds([payload.productId]);
    applyCartMutationToCookie({
      cookieStore: {
        get: (name) => request.cookies.get(name) ?? response.cookies.get(name),
        set: (name, value, options) => {
          response.cookies.set(name, value, options);
        }
      },
      productId: payload.productId,
      quantity: payload.quantity,
      selectedColor: payload.selectedColor ?? null,
      selectedSize: payload.selectedSize ?? null,
      customMargin: payload.customMargin ?? 0,
      savedForLater: payload.savedForLater ?? false
    });
    await recordTelemetryEvent({
      buyerId: viewer.buyerId,
      sellerId: product?.sellerId,
      event: payload.quantity > 0 ? "cart.added" : "cart.removed",
      page: request.nextUrl.pathname,
      productId: payload.productId,
      properties: {
        quantity: payload.quantity,
        customMargin: payload.customMargin ?? 0,
        savedForLater: payload.savedForLater ?? false
      }
    });
    logInfo("api.cart.updated", "Updated the marketplace cart.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      productId: payload.productId,
      quantity: payload.quantity
    });
    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath("/account");
    return withGuestCookie(response, viewer.guestCookieValue);
  } catch (error) {
    logError("api.cart.failed", "Failed to update the marketplace cart.", error, {
      ...requestContext,
      buyerId: viewer.buyerId
    });
    return NextResponse.json({ error: "Unable to update the cart." }, { status: 500 });
  }
}
