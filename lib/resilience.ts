import "server-only";
import { logWarn, type LogContext } from "@/lib/logger";

type RetryOptions = {
  attempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitter?: boolean;
  operationName: string;
  context?: LogContext;
  shouldRetry?: (error: unknown) => boolean;
};

type CircuitState = "closed" | "open" | "half_open";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorStatus(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return null;
  }

  const record = error as Record<string, unknown>;
  const status = record.status ?? record.statusCode ?? record.code;

  return typeof status === "number" || typeof status === "string" ? String(status) : null;
}

export function isTransientError(error: unknown) {
  const status = getErrorStatus(error);

  if (status && ["408", "409", "425", "429", "500", "502", "503", "504", "57014", "40001", "40P01"].includes(status)) {
    return true;
  }

  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  return [
    "fetch failed",
    "network",
    "timeout",
    "timed out",
    "econnreset",
    "econnrefused",
    "etimedout",
    "connection terminated",
    "too many connections",
    "rate limit",
    "deadlock detected",
    "could not serialize",
    "lock timeout",
    "temporarily unavailable"
  ].some((needle) => message.includes(needle));
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  {
    attempts = 3,
    baseDelayMs = 150,
    maxDelayMs = 1500,
    jitter = true,
    operationName,
    context,
    shouldRetry = isTransientError
  }: RetryOptions
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt >= attempts || !shouldRetry(error)) {
        throw error;
      }

      const exponentialDelay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      const jitterMs = jitter ? Math.floor(Math.random() * Math.min(100, exponentialDelay)) : 0;
      const delayMs = exponentialDelay + jitterMs;

      logWarn("resilience.retry", "Retrying a transient operation failure.", {
        ...context,
        operationName,
        attempt,
        attempts,
        delayMs,
        error: error instanceof Error ? error.message : String(error)
      });

      await sleep(delayMs);
    }
  }

  throw lastError;
}

export class CircuitBreaker {
  private state: CircuitState = "closed";
  private failures = 0;
  private openedAt = 0;

  constructor(
    private readonly name: string,
    private readonly options: {
      failureThreshold?: number;
      resetAfterMs?: number;
    } = {}
  ) {}

  async execute<T>(operation: () => Promise<T>, context?: LogContext) {
    const failureThreshold = this.options.failureThreshold ?? 5;
    const resetAfterMs = this.options.resetAfterMs ?? 30_000;

    if (this.state === "open") {
      const canProbe = Date.now() - this.openedAt >= resetAfterMs;

      if (!canProbe) {
        throw new Error(`Circuit breaker ${this.name} is open. Try again shortly.`);
      }

      this.state = "half_open";
    }

    try {
      const result = await operation();
      this.failures = 0;
      this.state = "closed";
      return result;
    } catch (error) {
      this.failures += 1;

      if (this.failures >= failureThreshold) {
        this.state = "open";
        this.openedAt = Date.now();
        logWarn("resilience.circuit_open", "Circuit breaker opened after repeated failures.", {
          ...context,
          circuit: this.name,
          failures: this.failures,
          resetAfterMs,
          error: error instanceof Error ? error.message : String(error)
        });
      }

      throw error;
    }
  }
}

export const supabaseCircuitBreaker = new CircuitBreaker("supabase", {
  failureThreshold: 4,
  resetAfterMs: 20_000
});

export const razorpayCircuitBreaker = new CircuitBreaker("razorpay", {
  failureThreshold: 3,
  resetAfterMs: 30_000
});
