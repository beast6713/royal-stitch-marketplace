import "server-only";
import { getProductsByIds } from "@/lib/products";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { CartItem, CartSnapshot, Product } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type MutableCookieStore = CookieReader & {
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

type CartRow = {
  id: string;
  buyer_identifier: string;
  product_id: string;
  quantity: number;
  selected_color: string;
  selected_size: string;
  custom_margin: number | null;
  saved_for_later: boolean | null;
  created_at: string;
};

type CartCookieItem = {
  productId: string;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  customMargin?: number;
  savedForLater?: boolean;
};

export const CART_COOKIE_NAME = "rs_cart";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function parseCartCookie(value: string | undefined): CartCookieItem[] {
  if (!value) {
    return [];
  }

  try {
    const parsed = JSON.parse(value) as CartCookieItem[];

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((entry) => typeof entry?.productId === "string")
      .map((entry) => ({
        productId: entry.productId,
        quantity: Math.max(1, Number(entry.quantity ?? 1)),
        selectedColor: entry.selectedColor ?? null,
        selectedSize: entry.selectedSize ?? null,
        customMargin: Number(entry.customMargin ?? 0),
        savedForLater: Boolean(entry.savedForLater)
      }));
  } catch {
    return [];
  }
}

function serializeCartCookie(items: CartCookieItem[]) {
  return JSON.stringify(items.slice(0, 20));
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function buildEmptyCartSnapshot(): CartSnapshot {
  return {
    items: [],
    subtotal: 0,
    shippingFee: 0,
    discountTotal: 0,
    total: 0,
    estimatedDeliveryLabel: "Add products to see delivery estimates"
  };
}

function buildCartSnapshot(items: CartItem[]): CartSnapshot {
  const activeItems = items.filter((item) => !item.savedForLater);
  const subtotal = activeItems.reduce(
    (sum, item) => sum + (item.product.price + (item.customMargin ?? 0)) * item.quantity,
    0
  );
  const compareAtTotal = activeItems.reduce((sum, item) => {
    const comparePrice = item.product.compareAtPrice ?? item.product.price;
    return sum + comparePrice * item.quantity;
  }, 0);
  const discountTotal = Math.max(compareAtTotal - subtotal, 0);
  const shippingFee = activeItems.length === 0 ? 0 : subtotal >= 2499 ? 0 : 99;
  const latestDispatchDays =
    activeItems.length > 0
      ? Math.max(...activeItems.map((item) => item.product.estimatedDispatchDays ?? 3))
      : 0;
  const estimatedDeliveryDate =
    activeItems.length > 0 ? addDays(new Date(), latestDispatchDays + 3) : null;

  return {
    items,
    subtotal,
    shippingFee,
    discountTotal,
    total: subtotal + shippingFee,
    estimatedDeliveryLabel: estimatedDeliveryDate
      ? `Delivery by ${formatShortDate(estimatedDeliveryDate.toISOString())}`
      : "Add products to see delivery estimates"
  };
}

async function getProductMap(productIds: string[]) {
  const products = await getProductsByIds(productIds);
  return new Map(products.map((product) => [product.id, product]));
}

function mapCookieItemsToCartItems(
  buyerId: string,
  products: Map<string, Product>,
  items: CartCookieItem[]
): CartItem[] {
  return items.flatMap((item, index) => {
    const product = products.get(item.productId);

    if (!product) {
      return [];
    }

    return [
      {
        id: `cookie-cart-${index}-${item.productId}`,
        buyerId,
        productId: item.productId,
        quantity: item.quantity,
        selectedColor: item.selectedColor ?? null,
        selectedSize: item.selectedSize ?? null,
        customMargin: item.customMargin ?? 0,
        savedForLater: item.savedForLater ?? false,
        product
      }
    ];
  });
}

function mapRowsToCartItems(
  products: Map<string, Product>,
  rows: CartRow[]
): CartItem[] {
  return rows.flatMap((row) => {
    const product = products.get(row.product_id);

    if (!product) {
      return [];
    }

    return [
      {
        id: row.id,
        buyerId: row.buyer_identifier,
        productId: row.product_id,
        quantity: row.quantity,
        selectedColor: row.selected_color || null,
        selectedSize: row.selected_size || null,
        customMargin: row.custom_margin ?? 0,
        savedForLater: row.saved_for_later ?? false,
        product
      }
    ];
  });
}

export function applyCartMutationToCookie({
  cookieStore,
  productId,
  quantity,
  selectedColor,
  selectedSize,
  customMargin,
  savedForLater
}: {
  cookieStore: MutableCookieStore;
  productId: string;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  customMargin?: number;
  savedForLater?: boolean;
}) {
  const currentItems = parseCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value);
  const existingItem = currentItems.find(
    (item) =>
      item.productId === productId &&
      (item.selectedColor ?? null) === (selectedColor ?? null) &&
      (item.selectedSize ?? null) === (selectedSize ?? null)
  );

  const nextItems = currentItems.filter(
    (item) =>
      !(
        item.productId === productId &&
        (item.selectedColor ?? null) === (selectedColor ?? null) &&
        (item.selectedSize ?? null) === (selectedSize ?? null)
      )
  );

  if (quantity > 0) {
    nextItems.unshift({
      productId,
      quantity,
      selectedColor: selectedColor ?? existingItem?.selectedColor ?? null,
      selectedSize: selectedSize ?? existingItem?.selectedSize ?? null,
      customMargin: customMargin ?? existingItem?.customMargin ?? 0,
      savedForLater: savedForLater ?? existingItem?.savedForLater ?? false
    });
  }

  if (cookieStore.set) {
    cookieStore.set(CART_COOKIE_NAME, serializeCartCookie(nextItems), {
      path: "/",
      maxAge: COOKIE_MAX_AGE,
      sameSite: "lax"
    });
  }

  return nextItems;
}

export async function getCartSnapshot({
  buyerId,
  cookieStore
}: {
  buyerId: string;
  cookieStore?: CookieReader;
}): Promise<CartSnapshot> {
  if (hasSupabaseAdminConfig()) {
    const supabase = getSupabaseAdminClient();
    const { data: cartData } = await supabase
      .from("cart")
      .select("id")
      .eq("buyer_identifier", buyerId)
      .single();

    if (!cartData) {
      return buildEmptyCartSnapshot();
    }

    const { data, error } = await supabase
      .from("cart_items")
      .select(
        "id, cart_id, product_id, quantity, selected_color, selected_size, custom_margin, saved_for_later, created_at"
      )
      .eq("cart_id", cartData.id)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const productMap = await getProductMap((data ?? []).map((row) => row.product_id));

    return buildCartSnapshot(mapRowsToCartItems(productMap, (data ?? []).map(row => ({ ...row, buyer_identifier: buyerId })) as CartRow[]));
  }

  if (!cookieStore) {
    return buildEmptyCartSnapshot();
  }

  const cookieItems = parseCartCookie(cookieStore.get(CART_COOKIE_NAME)?.value);
  const productMap = await getProductMap(cookieItems.map((item) => item.productId));
  return buildCartSnapshot(mapCookieItemsToCartItems(buyerId, productMap, cookieItems));
}

export async function upsertCartItem({
  buyerId,
  productId,
  quantity,
  selectedColor,
  selectedSize,
  customMargin,
  savedForLater
}: {
  buyerId: string;
  productId: string;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  customMargin?: number;
  savedForLater?: boolean;
}) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  let { data: cartData } = await supabase
    .from("cart")
    .select("id")
    .eq("buyer_identifier", buyerId)
    .single();

  if (!cartData) {
    const { data: newCart, error: cartError } = await supabase
      .from("cart")
      .insert({ buyer_identifier: buyerId })
      .select("id")
      .single();
      
    if (cartError) {
      throw new Error(cartError.message);
    }
    cartData = newCart;
  }

  if (!cartData) return;

  if (quantity <= 0) {
    const { error } = await supabase
      .from("cart_items")
      .delete()
      .eq("cart_id", cartData.id)
      .eq("product_id", productId)
      .eq("selected_color", selectedColor ?? "")
      .eq("selected_size", selectedSize ?? "");

    if (error) {
      throw new Error(error.message);
    }

    return;
  }

  const { error } = await supabase.from("cart_items").upsert(
    {
      cart_id: cartData.id,
      product_id: productId,
      quantity,
      selected_color: selectedColor ?? "",
      selected_size: selectedSize ?? "",
      custom_margin: customMargin ?? 0,
      saved_for_later: savedForLater ?? false,
      updated_at: new Date().toISOString()
    },
    {
      onConflict: "cart_id,product_id,selected_color,selected_size"
    }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function clearCart(buyerId: string) {
  if (!hasSupabaseAdminConfig()) {
    return;
  }

  const supabase = getSupabaseAdminClient();
  const { data: cartData } = await supabase
    .from("cart")
    .select("id")
    .eq("buyer_identifier", buyerId)
    .single();

  if (cartData) {
    const { error } = await supabase.from("cart_items").delete().eq("cart_id", cartData.id);

    if (error) {
      throw new Error(error.message);
    }
  }
}
