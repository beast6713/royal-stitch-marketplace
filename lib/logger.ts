import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

export type LogContext = {
  requestId?: string;
  route?: string;
  method?: string;
  pathname?: string;
  userId?: string | null;
  [key: string]: unknown;
};

export type RequestContext = LogContext & {
  requestId: string;
  route: string;
  method: string;
  pathname: string;
};

type LogLevel = "info" | "warn" | "error";

type StructuredLog = {
  timestamp: string;
  level: LogLevel;
  event: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
};

function serializeError(error: unknown) {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack
    };
  }

  return {
    name: "UnknownError",
    message: typeof error === "string" ? error : "Unknown error"
  };
}

function emitLog(payload: StructuredLog) {
  const line = JSON.stringify(payload);

  if (payload.level === "error") {
    console.error(line);
    return;
  }

  if (payload.level === "warn") {
    console.warn(line);
    return;
  }

  console.log(line);
}

function sendToMonitoring(payload: StructuredLog) {
  if (!env.MONITORING_WEBHOOK_URL || payload.level !== "error") {
    return;
  }

  void fetch(env.MONITORING_WEBHOOK_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload),
    cache: "no-store"
  }).catch((deliveryError) => {
    emitLog({
      timestamp: new Date().toISOString(),
      level: "warn",
      event: "monitoring.delivery_failed",
      message: "Unable to forward log event to the monitoring webhook.",
      error: serializeError(deliveryError)
    });
  });
}

function buildPayload(
  level: LogLevel,
  event: string,
  message: string,
  context?: LogContext,
  error?: unknown
): StructuredLog {
  return {
    timestamp: new Date().toISOString(),
    level,
    event,
    message,
    context,
    error: error ? serializeError(error) : undefined
  };
}

export function logInfo(event: string, message: string, context?: LogContext) {
  emitLog(buildPayload("info", event, message, context));
}

export function logWarn(event: string, message: string, context?: LogContext, error?: unknown) {
  emitLog(buildPayload("warn", event, message, context, error));
}

export function logError(event: string, message: string, error: unknown, context?: LogContext) {
  const payload = buildPayload("error", event, message, context, error);
  emitLog(payload);
  sendToMonitoring(payload);
}

export function createRequestContext(
  request: NextRequest,
  context: Omit<LogContext, "requestId" | "route" | "method" | "pathname"> = {}
): RequestContext {
  const url = new URL(request.url);

  return {
    requestId: request.headers.get("x-request-id") ?? crypto.randomUUID(),
    route: url.pathname,
    pathname: url.pathname,
    method: request.method,
    vercelId: request.headers.get("x-vercel-id") ?? undefined,
    ...context
  };
}
