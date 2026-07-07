import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { createProductReview } from "@/lib/reviews";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity, GUEST_BUYER_COOKIE } from "@/lib/viewer";

export const runtime = "nodejs";

const payloadSchema = z.object({
  productId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(3).max(80),
  body: z.string().trim().min(12).max(1200),
  mediaUrl: z.string().url().nullable().optional(),
  sizeInsight: z.string().trim().max(80).nullable().optional()
});

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);
  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    logWarn("api.reviews.bad_request", "Invalid review payload received.", {
      ...requestContext,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid review payload." }, { status: 400 });
  }

  try {
    const review = await createProductReview({
      buyerId: viewer.buyerId,
      buyerName: viewer.buyerName,
      productId: payload.productId,
      rating: payload.rating,
      title: payload.title,
      body: payload.body,
      mediaUrl: payload.mediaUrl ?? null,
      sizeInsight: payload.sizeInsight ?? null
    });

    await recordTelemetryEvent({
      buyerId: viewer.buyerId,
      event: "review.created",
      page: request.nextUrl.pathname,
      productId: payload.productId,
      properties: {
        rating: payload.rating,
        verifiedPurchase: review.verifiedPurchase
      }
    });

    logInfo("api.reviews.created", "Marketplace review submitted.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      productId: payload.productId
    });

    const response = NextResponse.json({ review }, { status: 201 });

    if (viewer.guestCookieValue) {
      response.cookies.set(GUEST_BUYER_COOKIE, viewer.guestCookieValue, {
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        sameSite: "lax"
      });
    }

    revalidatePath(`/products/${payload.productId}`);
    revalidatePath("/");
    return response;
  } catch (error) {
    logError("api.reviews.failed", "Unable to submit marketplace review.", error, {
      ...requestContext,
      buyerId: viewer.buyerId,
      productId: payload.productId
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to submit review right now."
      },
      { status: 500 }
    );
  }
}
