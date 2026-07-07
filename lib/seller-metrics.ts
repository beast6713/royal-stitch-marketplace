import "server-only";
import { unstable_cache } from "next/cache";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";

export type SellerMetricsSnapshot = {
  total_revenue: number;
  pending_orders: number;
  completed_orders: number;
  top_products: Array<{
    product_name: string;
    units_sold: number;
  }>;
};

export const getCachedSellerMetrics = unstable_cache(
  async (sellerId: string): Promise<SellerMetricsSnapshot | null> => {
    if (!hasSupabaseAdminConfig()) {
      return null;
    }

    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase.rpc("get_seller_metrics", {
      p_seller_id: sellerId
    });

    if (error) {
      throw new Error(error.message);
    }

    return data as SellerMetricsSnapshot;
  },
  ["seller-dashboard-metrics"],
  {
    revalidate: 120
  }
);
