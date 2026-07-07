"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

// Extend Window interface for our mock tracking layers
declare global {
  interface Window {
    dataLayer: any[];
  }
}

export function AnalyticsLayer() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // Initialize data layer if not present
    window.dataLayer = window.dataLayer || [];

    // Track Pageview
    const url = pathname + (searchParams?.toString() ? `?${searchParams.toString()}` : "");
    window.dataLayer.push({
      event: "page_view",
      page_path: url,
    });
    
    // In a real app we'd trigger a snippet (like `window.gtag('event', 'page_view')`)
    console.log(`[Analytics] Tracked page view: ${url}`);
  }, [pathname, searchParams]);

  useEffect(() => {
    // Listen for crucial global user engagement events
    const handleGlobalClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement;

      // Check if button or link inside button
      const buttonOrLink = target.closest("button") || target.closest("a");
      if (!buttonOrLink) return;

      const text = buttonOrLink.textContent?.toLowerCase() || "";
      const href = buttonOrLink.getAttribute("href") || "";

      if (text.includes("add to cart") || text.includes("buy now")) {
        window.dataLayer.push({
          event: "add_to_cart",
          click_target: text,
        });
        console.log("[Analytics] Tracked add_to_cart event");
      }

      if (href.includes("/products/")) {
        window.dataLayer.push({
          event: "view_item",
          item_url: href,
        });
        console.log(`[Analytics] Tracked view_item event: ${href}`);
      }
    };

    document.addEventListener("click", handleGlobalClick, { capture: true });
    return () => document.removeEventListener("click", handleGlobalClick, { capture: true });
  }, []);

  return null;
}
