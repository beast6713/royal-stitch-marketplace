import "server-only";
import { unstable_cache } from "next/cache";
import { getProductsByIds } from "@/lib/products";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { Product } from "@/lib/types";

type TrendingRow = {
  product_id: string;
  views: number;
  carts: number;
  purchases: number;
  score: number;
};

export type TrendingProduct = Product & {
  trendScore: number;
  trendBreakdown: {
    views: number;
    carts: number;
    purchases: number;
  };
};

const readTrendingRows = unstable_cache(
  async (limit: number, windowDays: number) => {
    if (!hasSupabaseAdminConfig()) {
      return [] as TrendingRow[];
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("get_trending_products", {
      p_limit: limit,
      p_window_days: windowDays
    });

    if (error) {
      throw new Error(error.message);
    }

    return (data ?? []) as TrendingRow[];
  },
  ["marketplace-trending-products"],
  {
    revalidate: 120
  }
);

export async function getTrendingProducts({
  limit = 8,
  windowDays = 7
}: {
  limit?: number;
  windowDays?: number;
} = {}): Promise<TrendingProduct[]> {
  const safeLimit = Math.min(Math.max(Math.floor(limit), 1), 24);
  const safeWindowDays = Math.min(Math.max(Math.floor(windowDays), 1), 30);
  const rows = await readTrendingRows(safeLimit, safeWindowDays);

  if (rows.length === 0) {
    return [];
  }

  const productMap = new Map(
    (await getProductsByIds(rows.map((row) => row.product_id))).map((product) => [product.id, product])
  );

  return rows.flatMap((row) => {
    const product = productMap.get(row.product_id);

    if (!product) {
      return [];
    }

    return [
      {
        ...product,
        trendScore: Number(row.score),
        trendBreakdown: {
          views: Number(row.views),
          carts: Number(row.carts),
          purchases: Number(row.purchases)
        }
      }
    ];
  });
}
