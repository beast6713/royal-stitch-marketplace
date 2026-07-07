import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import {
  confirmRazorpayPayment,
  getOrderByRazorpayOrderId,
  markRazorpayPaymentFailed
} from "@/lib/orders";
import {
  fetchRazorpayGatewayOrder,
  verifyRazorpayWebhookSignature
} from "@/lib/payments/razorpay";
import { getSupabaseAdminClient } from "@/lib/supabase";

export const runtime = "nodejs";

const WEBHOOK_MAX_AGE_SECONDS = 60 * 60 * 24;

const razorpayEntitySchema = z.object({
  id: z.string().optional(),
  order_id: z.string().optional(),
  status: z.string().optional(),
  error_description: z.string().nullable().optional()
}).passthrough();

const webhookSchema = z.object({
  event: z.string().min(2),
  created_at: z.number().optional(),
  payload: z
    .object({
      payment: z
        .object({
          entity: razorpayEntitySchema
        })
        .optional(),
      order: z
        .object({
          entity: razorpayEntitySchema
        })
        .optional()
    })
    .passthrough()
});

function isFreshWebhook(createdAtSeconds?: number) {
  if (!createdAtSeconds) {
    return true;
  }

  const nowSeconds = Math.floor(Date.now() / 1000);
  const ageSeconds = nowSeconds - createdAtSeconds;

  return ageSeconds >= -300 && ageSeconds <= WEBHOOK_MAX_AGE_SECONDS;
}

async function resolveLocalOrderId(razorpayOrderId: string) {
  const existingOrder = await getOrderByRazorpayOrderId(razorpayOrderId);

  if (existingOrder) {
    return existingOrder.id;
  }

  const gatewayOrder = await fetchRazorpayGatewayOrder(razorpayOrderId, {
    razorpayOrderId
  });
  const notes = (gatewayOrder as { notes?: Record<string, unknown> }).notes ?? {};
  const localOrderId = notes.local_order_id;

  return typeof localOrderId === "string" ? localOrderId : null;
}

async function markWebhookEvent(
  eventId: string,
  status: "processed" | "failed",
  error?: unknown
) {
  const supabase = getSupabaseAdminClient();
  await supabase
    .from("payment_webhook_events")
    .update({
      status,
      processed_at: status === "processed" ? new Date().toISOString() : null,
      error: error instanceof Error ? error.message : error ? String(error) : null
    })
    .eq("event_id", eventId);
}

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const signature = request.headers.get("x-razorpay-signature");
  const eventId = request.headers.get("x-razorpay-event-id");
  const rawBody = await request.text();

  if (!signature || !eventId) {
    logWarn("webhooks.razorpay.missing_headers", "Razorpay webhook arrived without required headers.", requestContext);
    return NextResponse.json({ error: "Missing webhook headers." }, { status: 400 });
  }

  let signatureValid = false;

  try {
    signatureValid = verifyRazorpayWebhookSignature({ rawBody, signature });
  } catch (error) {
    logError("webhooks.razorpay.secret_missing", "Razorpay webhook signature verification is not configured.", error, {
      ...requestContext,
      eventId
    });
    return NextResponse.json({ error: "Webhook verification unavailable." }, { status: 500 });
  }

  if (!signatureValid) {
    logWarn("webhooks.razorpay.invalid_signature", "Rejected Razorpay webhook with invalid signature.", {
      ...requestContext,
      eventId
    });
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  let event: z.infer<typeof webhookSchema>;

  try {
    event = webhookSchema.parse(JSON.parse(rawBody));
  } catch (error) {
    logWarn("webhooks.razorpay.invalid_payload", "Rejected malformed Razorpay webhook payload.", {
      ...requestContext,
      eventId,
      error: error instanceof Error ? error.message : "Unknown validation error"
    });
    return NextResponse.json({ error: "Invalid webhook payload." }, { status: 400 });
  }

  if (!isFreshWebhook(event.created_at)) {
    logWarn("webhooks.razorpay.stale", "Rejected stale Razorpay webhook payload.", {
      ...requestContext,
      eventId,
      eventCreatedAt: event.created_at
    });
    return NextResponse.json({ error: "Stale webhook event." }, { status: 400 });
  }

  const payment = event.payload.payment?.entity;
  const orderEntity = event.payload.order?.entity;
  const razorpayOrderId = payment?.order_id ?? orderEntity?.id ?? null;
  const razorpayPaymentId = payment?.id ?? null;
  const supabase = getSupabaseAdminClient();
  const { error: insertError } = await supabase.from("payment_webhook_events").insert({
    event_id: eventId,
    provider: "razorpay",
    event_name: event.event,
    razorpay_order_id: razorpayOrderId,
    razorpay_payment_id: razorpayPaymentId,
    payload: event,
    status: "received"
  });

  if (insertError) {
    if (insertError.code === "23505") {
      logInfo("webhooks.razorpay.duplicate", "Ignored duplicate Razorpay webhook event.", {
        ...requestContext,
        eventId,
        eventName: event.event
      });
      return NextResponse.json({ status: "duplicate" });
    }

    logError("webhooks.razorpay.event_insert_failed", "Could not persist Razorpay webhook event before processing.", insertError, {
      ...requestContext,
      eventId
    });
    return NextResponse.json({ error: "Webhook persistence failed." }, { status: 500 });
  }

  try {
    if ((event.event === "payment.captured" || event.event === "order.paid") && razorpayOrderId && razorpayPaymentId) {
      const localOrderId = await resolveLocalOrderId(razorpayOrderId);

      if (!localOrderId) {
        throw new Error(`No local order found for Razorpay order ${razorpayOrderId}.`);
      }

      await confirmRazorpayPayment({
        orderId: localOrderId,
        buyerId: null,
        razorpayOrderId,
        razorpayPaymentId,
        rawPayload: {
          source: "razorpay_webhook",
          eventId,
          eventName: event.event
        }
      });
    }

    if (event.event === "payment.failed" && razorpayOrderId) {
      await markRazorpayPaymentFailed({
        razorpayOrderId,
        razorpayPaymentId,
        reason: payment?.error_description ?? "Razorpay reported payment failure."
      });
    }

    await markWebhookEvent(eventId, "processed");
    logInfo("webhooks.razorpay.processed", "Processed Razorpay webhook event.", {
      ...requestContext,
      eventId,
      eventName: event.event,
      razorpayOrderId,
      razorpayPaymentId
    });

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    await markWebhookEvent(eventId, "failed", error);
    logError("webhooks.razorpay.failed", "Razorpay webhook processing failed.", error, {
      ...requestContext,
      eventId,
      eventName: event.event,
      razorpayOrderId,
      razorpayPaymentId
    });
    return NextResponse.json({ error: "Webhook processing failed." }, { status: 500 });
  }
}
