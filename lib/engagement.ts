import type { AlertSubscription, EngagementSnapshot, Product } from "@/lib/types";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

export const ENGAGEMENT_COOKIE_NAMES = {
  wishlist: "rs_wishlist",
  savedForLater: "rs_saved",
  recentlyViewed: "rs_recent",
  backInStockAlerts: "rs_alert_stock",
  priceDropAlerts: "rs_alert_price"
} as const;

const MAX_TRACKED_IDS = 12;

function unique(values: string[]) {
  return Array.from(new Set(values));
}

export function parseIdCookie(value: string | undefined) {
  if (!value) {
    return [];
  }

  return unique(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .slice(0, MAX_TRACKED_IDS)
  );
}

export function serializeIdCookie(values: string[]) {
  return unique(values).slice(0, MAX_TRACKED_IDS).join(",");
}

export function readEngagementSnapshot(cookieStore: CookieReader): EngagementSnapshot {
  return {
    wishlistIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.wishlist)?.value),
    savedForLaterIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.savedForLater)?.value),
    recentlyViewedIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.recentlyViewed)?.value),
    backInStockAlertIds: parseIdCookie(
      cookieStore.get(ENGAGEMENT_COOKIE_NAMES.backInStockAlerts)?.value
    ),
    priceDropAlertIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.priceDropAlerts)?.value)
  };
}

export function buildAlertSubscriptions(
  products: Product[],
  engagement: EngagementSnapshot
): AlertSubscription[] {
  const productsById = new Map(products.map((product) => [product.id, product]));

  const backInStock = engagement.backInStockAlertIds.flatMap((productId) => {
    const product = productsById.get(productId);

    if (!product) {
      return [];
    }

    return [
      {
        productId,
        type: "back_in_stock" as const,
        label: `${product.name}: alert me when stock returns`
      }
    ];
  });

  const priceDrop = engagement.priceDropAlertIds.flatMap((productId) => {
    const product = productsById.get(productId);

    if (!product) {
      return [];
    }

    return [
      {
        productId,
        type: "price_drop" as const,
        label: `${product.name}: alert me on the next price drop`
      }
    ];
  });

  return [...backInStock, ...priceDrop];
}
