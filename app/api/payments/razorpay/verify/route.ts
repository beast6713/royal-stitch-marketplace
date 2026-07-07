import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { enqueueBackgroundJob } from "@/lib/background-jobs";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { confirmRazorpayPayment } from "@/lib/orders";
import { verifyRazorpayCheckoutSignature } from "@/lib/payments/razorpay";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { recordTelemetryEvent } from "@/lib/telemetry-store";
import { getViewerIdentity } from "@/lib/viewer";

export const runtime = "nodejs";

const payloadSchema = z.object({
  localOrderId: z.string().uuid(),
  razorpayOrderId: z.string().min(6).max(120),
  razorpayPaymentId: z.string().min(6).max(120),
  razorpaySignature: z.string().min(20).max(256)
});

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const viewer = await getViewerIdentity(request.cookies);
  const rateLimit = checkRateLimit({
    key: `razorpay-verify:${viewer.buyerId}:${getClientIp(request.headers)}`,
    limit: 12,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    logWarn("api.payments.razorpay.verify.bad_request", "Invalid Razorpay verification payload.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid payment verification payload." }, { status: 400 });
  }

  let signatureValid = false;

  try {
    signatureValid = verifyRazorpayCheckoutSignature({
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      signature: payload.razorpaySignature
    });
  } catch (error) {
    logError("api.payments.razorpay.verify.unconfigured", "Razorpay signature verification is not configured.", error, {
      ...requestContext,
      buyerId: viewer.buyerId
    });
    return NextResponse.json({ error: "Payment verification unavailable." }, { status: 500 });
  }

  if (!signatureValid) {
    logWarn("api.payments.razorpay.verify.invalid_signature", "Razorpay checkout signature was invalid.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      orderId: payload.localOrderId,
      razorpayOrderId: payload.razorpayOrderId
    });
    return NextResponse.json({ error: "Payment verification failed." }, { status: 400 });
  }

  try {
    const order = await confirmRazorpayPayment({
      orderId: payload.localOrderId,
      buyerId: viewer.buyerId,
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId,
      rawPayload: {
        source: "checkout_handler"
      }
    });

    for (const item of order.items) {
      await recordTelemetryEvent({
        buyerId: viewer.buyerId,
        sellerId: item.sellerId,
        orderId: order.id,
        event: "purchase.completed",
        page: request.nextUrl.pathname,
        productId: item.productId,
        properties: {
          quantity: item.quantity,
          paymentMethod: order.paymentMethod ?? "card",
          total: (item.unitPrice + (item.customMargin ?? 0)) * item.quantity
        }
      });
    }

    revalidatePath("/cart");
    revalidatePath("/orders");
    revalidatePath("/seller");
    revalidatePath("/account");

    logInfo("api.payments.razorpay.verify.completed", "Razorpay payment verified and order marked paid.", {
      ...requestContext,
      buyerId: viewer.buyerId,
      orderId: order.id,
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId
    });

    return NextResponse.json({ order });
  } catch (error) {
    await enqueueBackgroundJob({
      type: "payment_reconciliation",
      payload: {
        orderId: payload.localOrderId,
        buyerId: viewer.buyerId,
        razorpayOrderId: payload.razorpayOrderId,
        razorpayPaymentId: payload.razorpayPaymentId,
        source: "checkout_verify_failure"
      },
      idempotencyKey: `payment-reconcile:${payload.razorpayPaymentId}`,
      runAfter: new Date(Date.now() + 60_000),
      context: {
        ...requestContext,
        buyerId: viewer.buyerId,
        orderId: payload.localOrderId,
        razorpayOrderId: payload.razorpayOrderId,
        razorpayPaymentId: payload.razorpayPaymentId
      }
    }).catch((jobError) => {
      logError("api.payments.razorpay.verify.reconcile_job_failed", "Unable to enqueue payment reconciliation.", jobError, {
        ...requestContext,
        buyerId: viewer.buyerId,
        orderId: payload.localOrderId
      });
    });

    logError("api.payments.razorpay.verify.db_failed", "Payment was signed but DB confirmation failed.", error, {
      ...requestContext,
      buyerId: viewer.buyerId,
      orderId: payload.localOrderId,
      razorpayOrderId: payload.razorpayOrderId,
      razorpayPaymentId: payload.razorpayPaymentId
    });

    return NextResponse.json(
      {
        error: "Payment was received, but order confirmation is still being reconciled.",
        status: "reconciliation_pending",
        retryable: true
      },
      { status: 202 }
    );
  }
}
