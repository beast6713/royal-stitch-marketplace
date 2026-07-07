import "server-only";
import crypto from "crypto";
import Razorpay from "razorpay";
import { env, isRazorpayConfigured } from "@/lib/env";
import { type LogContext } from "@/lib/logger";
import { razorpayCircuitBreaker, withRetry } from "@/lib/resilience";

type RazorpayOrderCreateInput = {
  localOrderId: string;
  buyerId: string;
  amountPaise: number;
  currency?: "INR";
  idempotencyKey: string;
  context?: LogContext;
};

function assertRazorpayConfigured() {
  if (!isRazorpayConfigured()) {
    throw new Error("Razorpay keys are not configured.");
  }
}

function safeEqualHex(left: string, right: string) {
  const leftBuffer = Buffer.from(left, "hex");
  const rightBuffer = Buffer.from(right, "hex");

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

export function getRazorpayKeyId() {
  return env.RAZORPAY_KEY_ID ?? env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? "";
}

export function getRazorpayClient() {
  assertRazorpayConfigured();

  return new Razorpay({
    key_id: env.RAZORPAY_KEY_ID!,
    key_secret: env.RAZORPAY_KEY_SECRET!
  });
}

export function verifyRazorpayCheckoutSignature({
  razorpayOrderId,
  razorpayPaymentId,
  signature
}: {
  razorpayOrderId: string;
  razorpayPaymentId: string;
  signature: string;
}) {
  assertRazorpayConfigured();

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_KEY_SECRET!)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  return safeEqualHex(expectedSignature, signature);
}

export function verifyRazorpayWebhookSignature({
  rawBody,
  signature
}: {
  rawBody: string;
  signature: string;
}) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) {
    throw new Error("Razorpay webhook secret is not configured.");
  }

  const expectedSignature = crypto
    .createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest("hex");

  return safeEqualHex(expectedSignature, signature);
}

export async function createRazorpayGatewayOrder({
  localOrderId,
  buyerId,
  amountPaise,
  currency = "INR",
  idempotencyKey,
  context
}: RazorpayOrderCreateInput) {
  const razorpay = getRazorpayClient();

  return razorpayCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          return razorpay.orders.create({
            amount: amountPaise,
            currency,
            receipt: `order_${localOrderId.replace(/-/g, "").slice(0, 30)}`,
            notes: {
              local_order_id: localOrderId,
              buyer_id: buyerId,
              idempotency_key: idempotencyKey
            }
          });
        },
        {
          operationName: "razorpay.orders.create",
          context,
          attempts: 3,
          baseDelayMs: 300,
          maxDelayMs: 2_000
        }
      ),
    context
  );
}

export async function fetchRazorpayGatewayOrder(orderId: string, context?: LogContext) {
  const razorpay = getRazorpayClient();

  return razorpayCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          return razorpay.orders.fetch(orderId);
        },
        {
          operationName: "razorpay.orders.fetch",
          context,
          attempts: 2,
          baseDelayMs: 250,
          maxDelayMs: 1_000
        }
      ),
    context
  );
}
