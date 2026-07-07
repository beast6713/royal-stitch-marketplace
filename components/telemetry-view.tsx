"use client";

import { useEffect } from "react";

type TelemetryProperties = Record<string, string | number | boolean | undefined>;

function sendTelemetry(payload: {
  event: string;
  page: string;
  productId?: string;
  sellerId?: string;
  orderId?: string;
  properties?: TelemetryProperties;
}) {
  const body = JSON.stringify(payload);

  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon("/api/telemetry", new Blob([body], { type: "application/json" }));
    return;
  }

  void fetch("/api/telemetry", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body,
    keepalive: true
  });
}

export function TelemetryView({
  event = "page.viewed",
  page,
  productId,
  sellerId,
  orderId,
  properties
}: {
  event?: string;
  page: string;
  productId?: string;
  sellerId?: string;
  orderId?: string;
  properties?: TelemetryProperties;
}) {
  const propertyKey = JSON.stringify(properties ?? {});

  useEffect(() => {
    sendTelemetry({
      event,
      page,
      productId,
      sellerId,
      orderId,
      properties
    });
  }, [event, page, productId, sellerId, orderId, propertyKey, properties]);

  return null;
}
