import "server-only";
import { env } from "@/lib/env";
import { logError, logInfo, logWarn, type LogContext } from "@/lib/logger";
import { supabaseCircuitBreaker, withRetry } from "@/lib/resilience";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";

export type BackgroundJobType =
  | "order_confirmation_email"
  | "payment_reconciliation"
  | "release_abandoned_order";

type BackgroundJobPayload = {
  type: BackgroundJobType;
  payload: Record<string, unknown>;
  idempotencyKey?: string;
  runAfter?: Date;
  context?: LogContext;
};

type BackgroundJobRow = {
  id: string;
  job_type: BackgroundJobType;
  payload: Record<string, unknown>;
  attempts: number;
};

function nextRetryAt(attempts: number) {
  const delaySeconds = Math.min(60 * 30, 30 * 2 ** attempts);
  return new Date(Date.now() + delaySeconds * 1000).toISOString();
}

async function updateJob(
  jobId: string,
  values: Record<string, unknown>,
  context?: LogContext
) {
  const supabase = getSupabaseAdminClient();

  await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const { error } = await supabase
            .from("background_jobs")
            .update(values)
            .eq("id", jobId);

          if (error) {
            throw error;
          }
        },
        {
          operationName: "background_jobs.update",
          context
        }
      ),
    context
  );
}

async function sendOrderConfirmationEmail(payload: Record<string, unknown>) {
  if (!env.ORDER_EMAIL_WEBHOOK_URL) {
    logInfo("jobs.email.skipped", "Order confirmation email job completed without provider configuration.", {
      orderId: payload.orderId,
      buyerId: payload.buyerId
    });
    return;
  }

  const response = await fetch(env.ORDER_EMAIL_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`Email provider rejected the job with ${response.status}.`);
  }
}

async function processJob(job: BackgroundJobRow, context?: LogContext) {
  if (job.job_type === "order_confirmation_email") {
    await sendOrderConfirmationEmail(job.payload);
    return;
  }

  if (job.job_type === "release_abandoned_order") {
    const orderId = String(job.payload.orderId ?? "");

    if (!orderId) {
      throw new Error("release_abandoned_order job is missing orderId.");
    }

    const supabase = getSupabaseAdminClient();
    const { error } = await supabase.rpc("expire_pending_order", {
      p_order_id: orderId,
      p_reason: String(job.payload.reason ?? "payment_abandoned")
    });

    if (error) {
      throw error;
    }

    return;
  }

  if (job.job_type === "payment_reconciliation") {
    const orderId = String(job.payload.orderId ?? "");
    const buyerId = job.payload.buyerId == null ? null : String(job.payload.buyerId);
    const razorpayOrderId = String(job.payload.razorpayOrderId ?? "");
    const razorpayPaymentId = String(job.payload.razorpayPaymentId ?? "");

    if (!orderId) {
      throw new Error("payment_reconciliation job is missing orderId.");
    }

    const supabase = getSupabaseAdminClient();
    const { error } =
      razorpayOrderId && razorpayPaymentId
        ? await supabase.rpc("confirm_payment_transaction", {
            p_order_id: orderId,
            p_buyer_identifier: buyerId,
            p_razorpay_order_id: razorpayOrderId,
            p_razorpay_payment_id: razorpayPaymentId,
            p_raw_payload: job.payload
          })
        : await supabase.rpc("reconcile_payment_state", {
            p_order_id: orderId
          });

    if (error) {
      throw error;
    }

    return;
  }

  logWarn("jobs.unknown_type", "Skipped unknown background job type.", {
    ...context,
    jobId: job.id,
    jobType: job.job_type
  });
}

export async function enqueueBackgroundJob({
  type,
  payload,
  idempotencyKey,
  runAfter,
  context
}: BackgroundJobPayload) {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const insertPayload = {
    job_type: type,
    payload,
    run_after: (runAfter ?? new Date()).toISOString(),
    idempotency_key: idempotencyKey ?? null
  };

  const { data, error } = await supabaseCircuitBreaker.execute(
    () =>
      withRetry(
        async () => {
          const response = await supabase
            .from("background_jobs")
            .upsert(insertPayload, {
              onConflict: "idempotency_key",
              ignoreDuplicates: Boolean(idempotencyKey)
            })
            .select("id")
            .maybeSingle();

          if (response.error) {
            throw response.error;
          }

          return response;
        },
        {
          operationName: "background_jobs.enqueue",
          context
        }
      ),
    context
  );

  if (error) {
    throw error;
  }

  return data?.id ?? null;
}

export async function processDueBackgroundJobs({
  limit = 10,
  context
}: {
  limit?: number;
  context?: LogContext;
} = {}) {
  if (!hasSupabaseAdminConfig()) {
    return {
      processed: 0,
      failed: 0
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("background_jobs")
    .select("id, job_type, payload, attempts")
    .eq("status", "pending")
    .lte("run_after", new Date().toISOString())
    .order("run_after", { ascending: true })
    .limit(limit);

  if (error) {
    throw error;
  }

  let processed = 0;
  let failed = 0;

  for (const job of (data ?? []) as BackgroundJobRow[]) {
    try {
      await updateJob(
        job.id,
        {
          status: "processing",
          locked_at: new Date().toISOString()
        },
        context
      );

      await processJob(job, context);

      await updateJob(
        job.id,
        {
          status: "completed",
          completed_at: new Date().toISOString(),
          locked_at: null
        },
        context
      );
      processed += 1;
    } catch (error) {
      failed += 1;
      logError("jobs.process_failed", "Background job failed and will be retried if attempts remain.", error, {
        ...context,
        jobId: job.id,
        jobType: job.job_type
      });

      const attempts = job.attempts + 1;
      await updateJob(
        job.id,
        {
          attempts,
          status: attempts >= 5 ? "failed" : "pending",
          run_after: attempts >= 5 ? null : nextRetryAt(attempts),
          locked_at: null,
          last_error: error instanceof Error ? error.message : String(error)
        },
        context
      );
    }
  }

  return {
    processed,
    failed
  };
}
