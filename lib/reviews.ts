import "server-only";
import { mockProductReviews } from "@/lib/mock-data";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { ProductReview, ReviewSummary } from "@/lib/types";

type ReviewRow = {
  id: string;
  product_id: string;
  buyer_identifier: string;
  buyer_name: string;
  rating: number;
  title: string;
  body: string;
  verified_purchase: boolean | null;
  media_url: string | null;
  size_insight: string | null;
  created_at: string;
};

function summarizeReviews(reviews: ProductReview[]): ReviewSummary {
  if (reviews.length === 0) {
    return {
      averageRating: 0,
      totalReviews: 0,
      verifiedPurchaseCount: 0
    };
  }

  return {
    averageRating: Number(
      (
        reviews.reduce((sum, review) => sum + review.rating, 0) /
        reviews.length
      ).toFixed(1)
    ),
    totalReviews: reviews.length,
    verifiedPurchaseCount: reviews.filter((review) => review.verifiedPurchase).length
  };
}

function mapReviewRows(rows: ReviewRow[]): ProductReview[] {
  return rows.map((row) => ({
    id: row.id,
    productId: row.product_id,
    buyerId: row.buyer_identifier,
    buyerName: row.buyer_name,
    rating: row.rating,
    title: row.title,
    body: row.body,
    verifiedPurchase: row.verified_purchase ?? false,
    mediaUrl: row.media_url,
    sizeInsight: row.size_insight,
    createdAt: row.created_at
  }));
}

async function syncProductReviewSummary(productId: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .select("rating")
    .eq("product_id", productId);

  if (error) {
    throw new Error(error.message);
  }

  const ratings = (data ?? []).map((entry) => Number(entry.rating));
  const reviewCount = ratings.length;
  const averageRating =
    reviewCount > 0
      ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / reviewCount).toFixed(1))
      : null;

  const { error: productError } = await supabase
    .from("products")
    .update({
      review_count: reviewCount,
      average_rating: averageRating
    })
    .eq("id", productId);

  if (productError) {
    throw new Error(productError.message);
  }
}

export async function getProductReviews(productId: string): Promise<{
  reviews: ProductReview[];
  summary: ReviewSummary;
}> {
  if (!hasSupabaseAdminConfig()) {
    const reviews = mockProductReviews.filter((review) => review.productId === productId);
    return {
      reviews,
      summary: summarizeReviews(reviews)
    };
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("reviews")
    .select(
      "id, product_id, buyer_identifier, buyer_name, rating, title, body, verified_purchase, media_url, size_insight, created_at"
    )
    .eq("product_id", productId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  const reviews = mapReviewRows((data ?? []) as ReviewRow[]);

  return {
    reviews,
    summary: summarizeReviews(reviews)
  };
}

export async function createProductReview({
  buyerId,
  buyerName,
  productId,
  rating,
  title,
  body,
  mediaUrl,
  sizeInsight
}: {
  buyerId: string;
  buyerName: string;
  productId: string;
  rating: number;
  title: string;
  body: string;
  mediaUrl?: string | null;
  sizeInsight?: string | null;
}): Promise<ProductReview> {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to submit reviews.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: buyerOrders, error: buyerOrdersError } = await supabase
    .from("orders")
    .select("id")
    .eq("buyer_identifier", buyerId);

  if (buyerOrdersError) {
    throw new Error(buyerOrdersError.message);
  }

  const buyerOrderIds = (buyerOrders ?? []).map((entry) => entry.id);
  let verifiedPurchase = false;

  if (buyerOrderIds.length > 0) {
    const { data: matchingOrderItems, error: matchingOrderItemsError } = await supabase
      .from("order_items")
      .select("id")
      .eq("product_id", productId)
      .in("order_id", buyerOrderIds)
      .limit(1);

    if (matchingOrderItemsError) {
      throw new Error(matchingOrderItemsError.message);
    }

    verifiedPurchase = (matchingOrderItems ?? []).length > 0;
  }

  const { data, error } = await supabase
    .from("reviews")
    .insert({
      product_id: productId,
      buyer_identifier: buyerId,
      buyer_name: buyerName,
      rating,
      title,
      body,
      verified_purchase: verifiedPurchase,
      media_url: mediaUrl ?? null,
      size_insight: sizeInsight ?? null
    })
    .select(
      "id, product_id, buyer_identifier, buyer_name, rating, title, body, verified_purchase, media_url, size_insight, created_at"
    )
    .single();

  if (error || !data) {
    throw new Error(error?.message ?? "Unable to submit the review.");
  }

  await syncProductReviewSummary(productId);
  return mapReviewRows([data as ReviewRow])[0]!;
}
