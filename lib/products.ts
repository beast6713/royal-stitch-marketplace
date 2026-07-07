import "server-only";
import { unstable_cache, unstable_noStore as noStore } from "next/cache";
import { env } from "@/lib/env";
import { logError, type LogContext } from "@/lib/logger";
import { mockProducts } from "@/lib/mock-data";
import {
  buildProductSearchFilter,
  deriveProductStatus,
  filterProducts,
  shouldUseDemoMarketplaceData,
  validateProductCreateInput
} from "@/lib/product-core";
import {
  getSupabaseAdminClient,
  getSupabaseReadClient,
  hasSupabaseReadConfig,
  hasSupabaseWriteConfig
} from "@/lib/supabase";
import type {
  MarketplaceProfile,
  Product,
  ProductCollectionResult,
  ProductCreateInput,
  ProductFilters
} from "@/lib/types";

type ProductRow = {
  id: string;
  name: string;
  description: string;
  price: number | string;
  material: Product["material"];
  category: Product["category"];
  yarn_type: string;
  image_url: string;
  additional_image_urls?: string[] | null;
  seller_id: string;
  seller_name: string;
  handmade: boolean | null;
  created_at: string;
  compare_at_price?: number | string | null;
  stock_quantity?: number | null;
  reserved_quantity?: number | null;
  reorder_threshold?: number | null;
  status?: Product["status"] | null;
  average_rating?: number | string | null;
  review_count?: number | null;
  discount_ends_at?: string | null;
  quality_score?: number | null;
  counterfeit_risk?: Product["counterfeitRisk"] | null;
  price_drop_percent?: number | null;
  back_in_stock_subscribers?: number | null;
  tags?: string[] | null;
};

type ProductQueryOptions = {
  limit?: number;
  offset?: number;
};

function mapDatabaseProduct(row: ProductRow): Product {
  const stockQuantity = row.stock_quantity ?? 0;
  const reorderThreshold = row.reorder_threshold ?? 2;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price: Number(row.price),
    material: row.material,
    category: row.category,
    yarnType: row.yarn_type,
    imageUrl: row.image_url,
    additionalImageUrls: row.additional_image_urls ?? [],
    sellerId: row.seller_id,
    sellerName: row.seller_name,
    handmade: row.handmade ?? true,
    createdAt: row.created_at,
    compareAtPrice:
      row.compare_at_price == null ? null : Number(row.compare_at_price),
    stockQuantity,
    reservedQuantity: row.reserved_quantity ?? 0,
    reorderThreshold,
    status: row.status ?? deriveProductStatus(stockQuantity, reorderThreshold),
    averageRating:
      row.average_rating == null ? undefined : Number(row.average_rating),
    reviewCount: row.review_count ?? undefined,
    discountEndsAt: row.discount_ends_at ?? null,
    qualityScore: row.quality_score ?? undefined,
    counterfeitRisk: row.counterfeit_risk ?? undefined,
    priceDropPercent: row.price_drop_percent ?? null,
    backInStockSubscribers: row.back_in_stock_subscribers ?? 0,
    tags: row.tags ?? []
  };
}

const readMarketplaceRows = unstable_cache(
  async (
    material: string,
    category: string,
    queryValue: string,
    priceRange: string,
    rating: string,
    limit: number,
    offset: number
  ) => {
    const supabase = getSupabaseReadClient();
    let query = supabase
      .from("products")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (material) {
      query = query.eq("material", material);
    }

    if (category) {
      query = query.eq("category", category);
    }

    if (queryValue) {
      const searchFilter = buildProductSearchFilter(queryValue);
      if (searchFilter) {
        query = query.or(searchFilter);
      }
    }

    if (priceRange === "under-1500") {
      query = query.lt("price", 1500);
    }

    if (priceRange === "1500-3000") {
      query = query.gte("price", 1500).lt("price", 3000);
    }

    if (priceRange === "3000-plus") {
      query = query.gte("price", 3000);
    }

    if (rating === "4-plus") {
      query = query.gte("average_rating", 4);
    }

    if (rating === "4.5-plus") {
      query = query.gte("average_rating", 4.5);
    }

    const { data, error, count } = await query;

    return {
      data,
      error,
      count
    };
  },
  ["marketplace-read-products"],
  {
    revalidate: 300
  }
);

export async function getMarketplaceProducts(
  filters: ProductFilters,
  logContext?: LogContext,
  options: ProductQueryOptions = {}
): Promise<ProductCollectionResult> {
  const hasReadAccess = hasSupabaseReadConfig();
  const limit = Math.min(Math.max(Math.floor(options.limit ?? 100), 1), 100);
  const offset = Math.max(Math.floor(options.offset ?? 0), 0);
  const page = Math.floor(offset / limit) + 1;

  if (!hasReadAccess) {
    if (
      shouldUseDemoMarketplaceData({
        hasReadConfig: hasReadAccess,
        nodeEnv: env.NODE_ENV,
        forceDemoMode: env.ENABLE_DEMO_MODE
      })
    ) {
      const filteredDemoProducts = filterProducts(mockProducts, filters);
      return {
        products: filteredDemoProducts.slice(offset, offset + limit),
        sourceState: "demo",
        errorMessage: "Preview mode is active because Supabase public read keys are not configured.",
        total: filteredDemoProducts.length,
        page,
        limit
      };
    }

    return {
      products: [],
      sourceState: "unconfigured",
      errorMessage: "Connect Supabase URL and anon key to load live marketplace listings."
    };
  }

  try {
    const { data, error, count } = await readMarketplaceRows(
      filters.material,
      filters.category,
      filters.query,
      filters.priceRange,
      filters.rating,
      limit,
      offset
    );

    if (error) {
      throw error;
    }

    return {
      products: filterProducts(
        (data ?? []).map((row) => mapDatabaseProduct(row as ProductRow)),
        filters
      ),
      sourceState: "database",
      total: count ?? data?.length ?? 0,
      page,
      limit
    };
  } catch (error) {
    logError("marketplace.products.read_failed", "Unable to load marketplace products.", error, {
      ...logContext,
      filters
    });
    return {
      products: [],
      sourceState: "error",
      errorMessage: "Live marketplace listings are temporarily unavailable."
    };
  }
}

export async function getSellerProducts(
  sellerId: string,
  logContext?: LogContext
): Promise<ProductCollectionResult> {
  noStore();

  if (!hasSupabaseReadConfig()) {
    return {
      products: [],
      sourceState: "unconfigured",
      errorMessage: "Connect Supabase URL and anon key to load seller listings."
    };
  }

  try {
    const supabase = getSupabaseReadClient();
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .eq("seller_id", sellerId)
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      throw error;
    }

    return {
      products: (data ?? []).map((row) => mapDatabaseProduct(row as ProductRow)),
      sourceState: "database"
    };
  } catch (error) {
    logError("marketplace.seller_products.read_failed", "Unable to load seller products.", error, {
      ...logContext,
      sellerId
    });
    return {
      products: [],
      sourceState: "error",
      errorMessage: "Seller listings could not be loaded from Supabase."
    };
  }
}

export async function getProductsByIds(productIds: string[]): Promise<Product[]> {
  const uniqueIds = Array.from(new Set(productIds)).filter(Boolean).slice(0, 100);

  if (uniqueIds.length === 0) {
    return [];
  }

  if (!hasSupabaseReadConfig()) {
    return mockProducts.filter((product) => uniqueIds.includes(product.id));
  }

  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .in("id", uniqueIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => mapDatabaseProduct(row as ProductRow));
}

export async function createProductListing(
  input: ProductCreateInput,
  sellerProfile: MarketplaceProfile
) {
  noStore();

  if (!hasSupabaseWriteConfig()) {
    throw new Error("Supabase write access is not configured yet.");
  }

  if (sellerProfile.role !== "seller") {
    throw new Error("Only seller accounts can publish products.");
  }

  const product = validateProductCreateInput(input);
  const supabase = getSupabaseAdminClient();

  const { data, error } = await supabase
    .from("products")
    .insert({
      seller_id: sellerProfile.sellerClerkId,
      seller_name: sellerProfile.fullName,
      name: product.name,
      description: product.description,
      price: product.price,
      compare_at_price: product.compareAtPrice ?? null,
      material: product.material,
      category: product.category,
      yarn_type: product.yarnType,
      image_url: product.imageUrl,
      handmade: true,
      stock_quantity: product.stockQuantity ?? 0,
      reserved_quantity: 0,
      reorder_threshold: product.reorderThreshold ?? 2,
      status: deriveProductStatus(product.stockQuantity, product.reorderThreshold),
      discount_ends_at: product.discountEndsAt ?? null,
      quality_score: 92,
      counterfeit_risk: "low",
      price_drop_percent: product.compareAtPrice ? 0 : null,
      back_in_stock_subscribers: 0,
      average_rating: 5,
      review_count: 0,
      tags: [product.category.toLowerCase(), product.material.toLowerCase(), product.yarnType.toLowerCase()]
    })
    .select("*")
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to create product.");
  }

  return mapDatabaseProduct(data as ProductRow);
}
