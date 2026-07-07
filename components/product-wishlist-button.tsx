"use client";

import { Heart } from "lucide-react";
import type { MouseEvent } from "react";
import { useEffect, useState } from "react";
import { pushMarketplaceToast, triggerMarketplaceHaptics } from "@/lib/client-toast";
import { ENGAGEMENT_COOKIE_NAMES, parseIdCookie, serializeIdCookie } from "@/lib/engagement";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function readCookie(name: string) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

function readWishlistIds() {
  const cookieValue = readCookie(ENGAGEMENT_COOKIE_NAMES.wishlist);
  const storageValue =
    typeof window !== "undefined"
      ? window.localStorage.getItem(ENGAGEMENT_COOKIE_NAMES.wishlist) ?? undefined
      : undefined;

  return parseIdCookie(cookieValue ?? storageValue);
}

function persistWishlistIds(values: string[]) {
  const serialized = serializeIdCookie(values);
  document.cookie = `${ENGAGEMENT_COOKIE_NAMES.wishlist}=${encodeURIComponent(serialized)}; path=/; max-age=${COOKIE_MAX_AGE}; samesite=lax`;
  window.localStorage.setItem(ENGAGEMENT_COOKIE_NAMES.wishlist, serialized);
}

export function ProductWishlistButton({
  productId,
  productName,
  className = ""
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const [active, setActive] = useState(false);

  useEffect(() => {
    setActive(readWishlistIds().includes(productId));
  }, [productId]);

  function toggleWishlist(event: MouseEvent<HTMLButtonElement>) {
    event.preventDefault();
    event.stopPropagation();

    const currentIds = readWishlistIds();
    const nextActive = !active;
    const nextIds = nextActive
      ? [productId, ...currentIds.filter((id) => id !== productId)]
      : currentIds.filter((id) => id !== productId);

    persistWishlistIds(nextIds);
    setActive(nextActive);
    triggerMarketplaceHaptics();
    pushMarketplaceToast({
      title: nextActive ? "Added to wishlist" : "Removed from wishlist",
      description: productName
    });

    void fetch("/api/engagement", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        productId,
        signalType: "wishlist",
        active: nextActive
      })
    }).catch(() => undefined);

    void fetch("/api/telemetry", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        event: "wishlist.toggled",
        page: "/",
        productId,
        properties: {
          active: nextActive
        }
      })
    }).catch(() => undefined);
  }

  return (
    <button
      type="button"
      aria-label={active ? `Remove ${productName} from wishlist` : `Save ${productName} to wishlist`}
      onClick={toggleWishlist}
      className={`${className} inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/80 bg-white/92 text-royal shadow-lg backdrop-blur transition hover:scale-105 hover:bg-white`}
    >
      <Heart className={`h-[18px] w-[18px] ${active ? "fill-current text-rose-500" : ""}`} />
    </button>
  );
}
