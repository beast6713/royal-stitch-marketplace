"use client";

import { Bell, BellRing, Bookmark, Heart } from "lucide-react";
import { useEffect, useState } from "react";
import { ENGAGEMENT_COOKIE_NAMES, parseIdCookie, serializeIdCookie } from "@/lib/engagement";
import { pushMarketplaceToast, triggerMarketplaceHaptics } from "@/lib/client-toast";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function readCookie(name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function readTrackedIds(name: string) {
  const cookieValue = readCookie(name);
  const storageValue =
    typeof window !== "undefined" ? window.localStorage.getItem(name) ?? undefined : undefined;

  return parseIdCookie(cookieValue ?? storageValue);
}

function persistTrackedIds(name: string, values: string[]) {
  const serialized = serializeIdCookie(values);
  document.cookie = `${name}=${encodeURIComponent(serialized)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  window.localStorage.setItem(name, serialized);
}

function sendTelemetry(payload: {
  event: string;
  page: string;
  productId: string;
  properties?: Record<string, string | number | boolean | undefined>;
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

export function EngagementControls({
  productId,
  productName,
  page
}: {
  productId: string;
  productName: string;
  page: string;
}) {
  const [wishlist, setWishlist] = useState(false);
  const [saved, setSaved] = useState(false);
  const [stockAlert, setStockAlert] = useState(false);
  const [priceAlert, setPriceAlert] = useState(false);

  useEffect(() => {
    setWishlist(readTrackedIds(ENGAGEMENT_COOKIE_NAMES.wishlist).includes(productId));
    setSaved(readTrackedIds(ENGAGEMENT_COOKIE_NAMES.savedForLater).includes(productId));
    setStockAlert(readTrackedIds(ENGAGEMENT_COOKIE_NAMES.backInStockAlerts).includes(productId));
    setPriceAlert(readTrackedIds(ENGAGEMENT_COOKIE_NAMES.priceDropAlerts).includes(productId));

    const recentlyViewed = readTrackedIds(ENGAGEMENT_COOKIE_NAMES.recentlyViewed);
    const nextRecentlyViewed = [productId, ...recentlyViewed.filter((id) => id !== productId)];
    persistTrackedIds(ENGAGEMENT_COOKIE_NAMES.recentlyViewed, nextRecentlyViewed);
    void fetch("/api/engagement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId,
        signalType: "recently_viewed",
        active: true
      })
    }).catch(() => undefined);

    sendTelemetry({
      event: "product.viewed",
      page,
      productId,
      properties: {
        productName
      }
    });
  }, [page, productId, productName]);

  function toggleTrackedProduct({
    cookieName,
    active,
    setActive,
    eventName
  }: {
    cookieName: string;
    active: boolean;
    setActive: (value: boolean) => void;
    eventName: string;
  }) {
    const currentIds = readTrackedIds(cookieName);
    const nextIds = active
      ? currentIds.filter((id) => id !== productId)
      : [productId, ...currentIds.filter((id) => id !== productId)];

    persistTrackedIds(cookieName, nextIds);
    setActive(!active);
    triggerMarketplaceHaptics();
    pushMarketplaceToast({
      title: !active ? "Saved successfully" : "Removed successfully",
      description: productName
    });
    const signalType =
      cookieName === ENGAGEMENT_COOKIE_NAMES.wishlist
        ? "wishlist"
        : cookieName === ENGAGEMENT_COOKIE_NAMES.savedForLater
          ? "save_for_later"
          : cookieName === ENGAGEMENT_COOKIE_NAMES.backInStockAlerts
            ? "back_in_stock"
            : "price_drop";
    void fetch("/api/engagement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId,
        signalType,
        active: !active
      })
    }).catch(() => undefined);

    sendTelemetry({
      event: eventName,
      page,
      productId,
      properties: {
        active: !active,
        productName
      }
    });
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() =>
          toggleTrackedProduct({
            cookieName: ENGAGEMENT_COOKIE_NAMES.wishlist,
            active: wishlist,
            setActive: setWishlist,
            eventName: "wishlist.toggled"
          })
        }
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          wishlist
            ? "bg-royal text-white"
            : "border border-royal/15 bg-white/80 text-royal hover:bg-white"
        }`}
      >
        <Heart className="mr-2 inline h-4 w-4" />
        {wishlist ? "Wishlisted" : "Add to wishlist"}
      </button>

      <button
        type="button"
        onClick={() =>
          toggleTrackedProduct({
            cookieName: ENGAGEMENT_COOKIE_NAMES.savedForLater,
            active: saved,
            setActive: setSaved,
            eventName: "saved_for_later.toggled"
          })
        }
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          saved
            ? "bg-gold text-white"
            : "border border-royal/15 bg-white/80 text-royal hover:bg-white"
        }`}
      >
        <Bookmark className="mr-2 inline h-4 w-4" />
        {saved ? "Saved for later" : "Save for later"}
      </button>

      <button
        type="button"
        onClick={() =>
          toggleTrackedProduct({
            cookieName: ENGAGEMENT_COOKIE_NAMES.priceDropAlerts,
            active: priceAlert,
            setActive: setPriceAlert,
            eventName: "price_alert.toggled"
          })
        }
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          priceAlert
            ? "bg-pine text-white"
            : "border border-royal/15 bg-white/80 text-royal hover:bg-white"
        }`}
      >
        <BellRing className="mr-2 inline h-4 w-4" />
        {priceAlert ? "Price-drop alert on" : "Price-drop alert"}
      </button>

      <button
        type="button"
        onClick={() =>
          toggleTrackedProduct({
            cookieName: ENGAGEMENT_COOKIE_NAMES.backInStockAlerts,
            active: stockAlert,
            setActive: setStockAlert,
            eventName: "stock_alert.toggled"
          })
        }
        className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
          stockAlert
            ? "bg-royal-soft text-white"
            : "border border-royal/15 bg-white/80 text-royal hover:bg-white"
        }`}
      >
        <Bell className="mr-2 inline h-4 w-4" />
        {stockAlert ? "Back-in-stock alert on" : "Back-in-stock alert"}
      </button>
    </div>
  );
}
