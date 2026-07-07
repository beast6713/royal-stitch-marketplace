import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { enqueueBackgroundJob } from "@/lib/background-jobs";
import {
  attachRazorpayOrderToOrder,
  createOrdersFromCart
} from "@/lib/orders";
import {
  createRazorpayGatewayOrder,
  getRazorpayKeyId
} from "@/lib/payments/razorpay";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity, GUEST_BUYER_COOKIE } from "@/lib/viewer";

export const runtime = "nodejs";

const payloadSchema = z.object({
  paymentMethod: z.enum(["upi", "card"]),
  shippingAddress: z.string().min(10, "A full shipping address is required").max(1000),
  shareChannel: z.enum(["whatsapp", "instagram", "link"]).nullable().optional(),
  idempotencyKey: z.string().min(8).max(120).optional()
});

function withGuestCookie(response: NextResponse, guestCookieValue?: string) {
  if (guestCookieValue) {
    response.cookies.set(GUEST_BUYER_COOKIE, guestCookieValue, {
      path: "/",
      maxAge: 60 * 60 * 24 * 180,
      sameSite: "lax"
    });
  }

  return response;
}

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);
  const rateLimit = checkRateLimit({
    key: `razorpay-order:${viewer.buyerId}:${getClientIp(request.headers)}`,
    limit: 8,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    logWarn("api.payments.razorpay.order.bad_request", "Invalid Razorpay order payload.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid payment initialization payload." }, { status: 400 });
  }

  const idempotencyKey =
    request.headers.get("idempotency-key") ?? payload.idempotencyKey ?? randomUUID();

  let localOrderId: string | null = null;

  try {
    const [localOrder] = await createOrdersFromCart({
      buyer: viewer,
      paymentMethod: payload.paymentMethod,
      shareChannel: payload.shareChannel ?? null,
      razorpayOrderId: null,
      shippingAddress: payload.shippingAddress,
      idempotencyKey
    });

    if (!localOrder) {
      throw new Error("Unable to create a pending order.");
    }

    localOrderId = localOrder.id;

    for (const item of localOrder.items) {
      await recordTelemetryEvent({
        buyerId: viewer.buyerId,
        sellerId: item.sellerId,
        orderId: localOrder.id,
        event: "checkout.started",
        page: request.nextUrl.pathname,
        productId: item.productId,
        properties: {
          paymentMethod: payload.paymentMethod,
          quantity: item.quantity,
          total: (item.unitPrice + (item.customMargin ?? 0)) * item.quantity
        }
      });
    }

    if (localOrder.razorpayOrderId) {
      return withGuestCookie(
        NextResponse.json({
          keyId: getRazorpayKeyId(),
          localOrderId: localOrder.id,
          razorpayOrderId: localOrder.razorpayOrderId,
          amount: Math.round(localOrder.total * 100),
          currency: "INR",
          idempotencyKey
        }),
        viewer.guestCookieValue
      );
    }

    const gatewayOrder = await createRazorpayGatewayOrder({
      localOrderId: localOrder.id,
      buyerId: viewer.buyerId,
      amountPaise: Math.round(localOrder.total * 100),
      idempotencyKey,
      context: {
        ...requestContext,
        buyerId: viewer.buyerId,
        orderId: localOrder.id
      }
    });

    await attachRazorpayOrderToOrder({
      orderId: localOrder.id,
      buyerId: viewer.buyerId,
      razorpayOrderId: gatewayOrder.id
    });

    logInfo("api.payments.razorpay.order.created", "Created local and Razorpay pending order.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      orderId: localOrder.id,
      razorpayOrderId: gatewayOrder.id
    });

    return withGuestCookie(
      NextResponse.json(
        {
          keyId: getRazorpayKeyId(),
          localOrderId: localOrder.id,
          razorpayOrderId: gatewayOrder.id,
          amount: gatewayOrder.amount,
          currency: gatewayOrder.currency,
          idempotencyKey
        },
        { status: 201 }
      ),
      viewer.guestCookieValue
    );
  } catch (error) {
    if (localOrderId) {
      const releaseAt = new Date(Date.now() + 10 * 60 * 1000);
      await enqueueBackgroundJob({
        type: "release_abandoned_order",
        payload: {
          orderId: localOrderId,
          reason: "razorpay_order_creation_failed"
        },
        idempotencyKey: `release-after-gateway-failure:${localOrderId}`,
        runAfter: releaseAt,
        context: {
          ...requestContext,
          buyerId: viewer.buyerId,
          orderId: localOrderId
        }
      }).catch((releaseError) => {
        logError(
          "api.payments.razorpay.order.release_job_failed",
          "Unable to enqueue pending order release after Razorpay initialization failure.",
          releaseError,
          {
            ...requestContext,
            buyerId: viewer.buyerId,
            orderId: localOrderId
          }
        );
      });
    }

    logError("api.payments.razorpay.order.failed", "Unable to initialize Razorpay checkout.", error, {
      ...requestContext,
      buyerId: viewer.buyerId,
      idempotencyKey
    });

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to initialize payment.",
        retryable: true,
        idempotencyKey
      },
      { status: 500 }
    );
  }
}
