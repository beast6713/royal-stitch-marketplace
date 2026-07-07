import "server-only";
import { logWarn, type LogContext } from "@/lib/logger";
import { supabaseCircuitBreaker, withRetry } from "@/lib/resilience";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";

type AuditLogPayload = {
  actorId?: string | null;
  action: string;
  targetType: string;
  targetId?: string | null;
  metadata?: Record<string, unknown>;
  context?: LogContext;
};

export async function writeAuditLog({
  actorId,
  action,
  targetType,
  targetId,
  metadata,
  context
}: AuditLogPayload) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  try {
    const supabase = getSupabaseAdminClient();

    await supabaseCircuitBreaker.execute(
      () =>
        withRetry(
          async () => {
            const { error } = await supabase.from("audit_logs").insert({
              actor_identifier: actorId ?? null,
              action,
              target_type: targetType,
              target_id: targetId ?? null,
              metadata: metadata ?? {}
            });

            if (error) {
              throw error;
            }
          },
          {
            operationName: "audit_logs.insert",
            context
          }
        ),
      context
    );
  } catch (error) {
    logWarn("audit.write_failed", "Audit log write failed; primary action already completed.", {
      ...context,
      actorId,
      action,
      targetType,
      targetId,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}
