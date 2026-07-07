import "server-only";
import { ENGAGEMENT_COOKIE_NAMES, parseIdCookie, readEngagementSnapshot, serializeIdCookie } from "@/lib/engagement";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { EngagementSnapshot, SignalType } from "@/lib/types";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type SignalRow = {
  product_id: string;
  signal_type: SignalType;
  created_at: string;
};

type MutableEngagementCookieStore = CookieReader & {
  set?: (
    name: string,
    value: string,
    options?: {
      path?: string;
      maxAge?: number;
      sameSite?: "lax" | "strict" | "none";
    }
  ) => unknown;
};

const MAX_TRACKED_IDS = 12;
const COOKIE_MAX_AGE = 60 * 60 * 24 * 180;

function emptyEngagementSnapshot(): EngagementSnapshot {
  return {
    wishlistIds: [],
    savedForLaterIds: [],
    backInStockAlertIds: [],
    priceDropAlertIds: [],
    recentlyViewedIds: []
  };
}

function limitTrackedIds(values: string[]) {
  return Array.from(new Set(values)).slice(0, MAX_TRACKED_IDS);
}

function mapRowsToSnapshot(rows: SignalRow[]): EngagementSnapshot {
  const snapshot = emptyEngagementSnapshot();
  const orderedRows = [...rows].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  );

  for (const row of orderedRows) {
    if (row.signal_type === "wishlist") {
      snapshot.wishlistIds = limitTrackedIds([...snapshot.wishlistIds, row.product_id]);
    }

    if (row.signal_type === "save_for_later") {
      snapshot.savedForLaterIds = limitTrackedIds([...snapshot.savedForLaterIds, row.product_id]);
    }

    if (row.signal_type === "back_in_stock") {
      snapshot.backInStockAlertIds = limitTrackedIds([
        ...snapshot.backInStockAlertIds,
        row.product_id
      ]);
    }

    if (row.signal_type === "price_drop") {
      snapshot.priceDropAlertIds = limitTrackedIds([...snapshot.priceDropAlertIds, row.product_id]);
    }

    if (row.signal_type === "recently_viewed") {
      snapshot.recentlyViewedIds = limitTrackedIds([...snapshot.recentlyViewedIds, row.product_id]);
    }
  }

  return snapshot;
}

function readIdsForSignal(snapshot: EngagementSnapshot, signalType: SignalType) {
  if (signalType === "wishlist") {
    return snapshot.wishlistIds;
  }

  if (signalType === "save_for_later") {
    return snapshot.savedForLaterIds;
  }

  if (signalType === "back_in_stock") {
    return snapshot.backInStockAlertIds;
  }

  if (signalType === "price_drop") {
    return snapshot.priceDropAlertIds;
  }

  return snapshot.recentlyViewedIds;
}

function applySignalToSnapshot(
  snapshot: EngagementSnapshot,
  signalType: SignalType,
  productId: string,
  active: boolean
) {
  const currentIds = readIdsForSignal(snapshot, signalType);
  const nextIds = active
    ? limitTrackedIds([productId, ...currentIds.filter((id) => id !== productId)])
    : currentIds.filter((id) => id !== productId);

  if (signalType === "wishlist") {
    return {
      ...snapshot,
      wishlistIds: nextIds
    };
  }

  if (signalType === "save_for_later") {
    return {
      ...snapshot,
      savedForLaterIds: nextIds
    };
  }

  if (signalType === "back_in_stock") {
    return {
      ...snapshot,
      backInStockAlertIds: nextIds
    };
  }

  if (signalType === "price_drop") {
    return {
      ...snapshot,
      priceDropAlertIds: nextIds
    };
  }

  return {
    ...snapshot,
    recentlyViewedIds: nextIds
  };
}

function persistSnapshotToCookies(
  cookieStore: MutableEngagementCookieStore,
  snapshot: EngagementSnapshot
) {
  if (!cookieStore.set) {
    return;
  }

  const options = {
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    sameSite: "lax" as const
  };

  cookieStore.set(ENGAGEMENT_COOKIE_NAMES.wishlist, serializeIdCookie(snapshot.wishlistIds), options);
  cookieStore.set(
    ENGAGEMENT_COOKIE_NAMES.savedForLater,
    serializeIdCookie(snapshot.savedForLaterIds),
    options
  );
  cookieStore.set(
    ENGAGEMENT_COOKIE_NAMES.backInStockAlerts,
    serializeIdCookie(snapshot.backInStockAlertIds),
    options
  );
  cookieStore.set(
    ENGAGEMENT_COOKIE_NAMES.priceDropAlerts,
    serializeIdCookie(snapshot.priceDropAlertIds),
    options
  );
  cookieStore.set(
    ENGAGEMENT_COOKIE_NAMES.recentlyViewed,
    serializeIdCookie(snapshot.recentlyViewedIds),
    options
  );
}

export function applyEngagementSignalToCookies(
  cookieStore: MutableEngagementCookieStore,
  signalType: SignalType,
  productId: string,
  active: boolean
) {
  const currentSnapshot = {
    wishlistIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.wishlist)?.value),
    savedForLaterIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.savedForLater)?.value),
    backInStockAlertIds: parseIdCookie(
      cookieStore.get(ENGAGEMENT_COOKIE_NAMES.backInStockAlerts)?.value
    ),
    priceDropAlertIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.priceDropAlerts)?.value),
    recentlyViewedIds: parseIdCookie(cookieStore.get(ENGAGEMENT_COOKIE_NAMES.recentlyViewed)?.value)
  };
  const nextSnapshot = applySignalToSnapshot(currentSnapshot, signalType, productId, active);

  persistSnapshotToCookies(cookieStore, nextSnapshot);
  return nextSnapshot;
}

export async function getStoredEngagementSnapshot(
  buyerId: string,
  cookieStore?: CookieReader
): Promise<EngagementSnapshot> {
  if (!hasSupabaseAdminConfig()) {
    return cookieStore ? readEngagementSnapshot(cookieStore) : emptyEngagementSnapshot();
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("buyer_product_signals")
    .select("product_id, signal_type, created_at")
    .eq("buyer_identifier", buyerId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return mapRowsToSnapshot((data ?? []) as SignalRow[]);
}

export async function setStoredEngagementSignal({
  buyerId,
  productId,
  signalType,
  active
}: {
  buyerId: string;
  productId: string;
  signalType: SignalType;
  active: boolean;
}) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  const supabase = getSupabaseAdminClient();

  if (!active) {
    const { error } = await supabase
      .from("buyer_product_signals")
      .delete()
      .eq("buyer_identifier", buyerId)
      .eq("product_id", productId)
      .eq("signal_type", signalType);

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("buyer_product_signals").upsert(
    {
      buyer_identifier: buyerId,
      product_id: productId,
      signal_type: signalType,
      created_at: new Date().toISOString()
    },
    {
      onConflict: "buyer_identifier,product_id,signal_type"
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}
