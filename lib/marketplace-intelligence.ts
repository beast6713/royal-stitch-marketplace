import { mockCoupons, mockOrders, mockPriceHistory, mockReturnRequests, mockSupportCases, buyerProtectionPolicy } from "@/lib/mock-data";
import { buildAlertSubscriptions } from "@/lib/engagement";
import { deriveProductStatus, getProductDiscountPercent, isDealActive } from "@/lib/product-core";
import type {
  AnalyticsSummary,
  BuyerPortalSnapshot,
  EngagementSnapshot,
  ExperimentAssignments,
  HomeFeedSection,
  InventoryItem,
  MarketplaceHomeExperience,
  MarketplaceOrder,
  PricingInsight,
  Product,
  RankingVariant,
  RiskLevel,
  SellerGovernance,
  SellerOperationsSnapshot
} from "@/lib/types";

function uniqueById(products: Product[]) {
  return Array.from(new Map(products.map((product) => [product.id, product])).values());
}

function selectProductsByIds(products: Product[], ids: string[]) {
  const productMap = new Map(products.map((product) => [product.id, product]));

  return uniqueById(
    ids.flatMap((id) => {
      const product = productMap.get(id);
      return product ? [product] : [];
    })
  );
}

export function findProductById(products: Product[], productId: string) {
  return products.find((product) => product.id === productId) ?? null;
}

function getTrendScore(product: Product) {
  return (
    (product.averageRating ?? 4) * 25 +
    (product.reviewCount ?? 0) +
    (product.priceDropPercent ?? 0) * 4 +
    (product.backInStockSubscribers ?? 0) * 2 +
    (product.qualityScore ?? 80)
  );
}

export function rankProductsForVariant(products: Product[], ranking: RankingVariant) {
  return [...products].sort((left, right) => {
    if (ranking === "trend") {
      return getTrendScore(right) - getTrendScore(left);
    }

    return (
      (right.qualityScore ?? 0) - (left.qualityScore ?? 0) ||
      (right.averageRating ?? 0) - (left.averageRating ?? 0) ||
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

export function getSimilarProducts(products: Product[], referenceProduct: Product, limit = 4) {
  return [...products]
    .filter((product) => product.id !== referenceProduct.id)
    .sort((left, right) => {
      const leftScore =
        Number(left.category === referenceProduct.category) * 4 +
        Number(left.material === referenceProduct.material) * 3 +
        (left.tags ?? []).filter((tag) => referenceProduct.tags?.includes(tag)).length +
        (left.averageRating ?? 0);
      const rightScore =
        Number(right.category === referenceProduct.category) * 4 +
        Number(right.material === referenceProduct.material) * 3 +
        (right.tags ?? []).filter((tag) => referenceProduct.tags?.includes(tag)).length +
        (right.averageRating ?? 0);

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

export function getRecommendedProducts(
  products: Product[],
  engagement: EngagementSnapshot,
  limit = 4
) {
  const engagedProducts = selectProductsByIds(products, [
    ...engagement.wishlistIds,
    ...engagement.savedForLaterIds,
    ...engagement.recentlyViewedIds
  ]);

  if (engagedProducts.length === 0) {
    return [...products]
      .sort((left, right) => getTrendScore(right) - getTrendScore(left))
      .slice(0, limit);
  }

  const preferredMaterials = new Set(engagedProducts.map((product) => product.material));
  const preferredCategories = new Set(engagedProducts.map((product) => product.category));
  const engagedTags = new Set(engagedProducts.flatMap((product) => product.tags ?? []));
  const engagedIds = new Set(engagedProducts.map((product) => product.id));

  return [...products]
    .filter((product) => !engagedIds.has(product.id))
    .sort((left, right) => {
      const leftScore =
        Number(preferredMaterials.has(left.material)) * 4 +
        Number(preferredCategories.has(left.category)) * 4 +
        (left.tags ?? []).filter((tag) => engagedTags.has(tag)).length +
        (left.averageRating ?? 0);
      const rightScore =
        Number(preferredMaterials.has(right.material)) * 4 +
        Number(preferredCategories.has(right.category)) * 4 +
        (right.tags ?? []).filter((tag) => engagedTags.has(tag)).length +
        (right.averageRating ?? 0);

      return rightScore - leftScore;
    })
    .slice(0, limit);
}

function buildHomeSections(
  rankedProducts: Product[],
  engagement: EngagementSnapshot,
  experiments: ExperimentAssignments
): HomeFeedSection[] {
  const recentlyViewed = selectProductsByIds(rankedProducts, engagement.recentlyViewedIds);
  const recommended = getRecommendedProducts(rankedProducts, engagement, 4);
  const deals = rankedProducts
    .filter((product) => getProductDiscountPercent(product.price, product.compareAtPrice) || isDealActive(product.discountEndsAt))
    .slice(0, 4);
  const trusted = [...rankedProducts]
    .sort((left, right) => (right.qualityScore ?? 0) - (left.qualityScore ?? 0))
    .slice(0, 4);

  const sections: HomeFeedSection[] = [];

  if (recommended.length > 0) {
    sections.push({
      id: "recommended",
      title: "Recommended for you",
      description: "Weighted using your saved, wishlisted, and recently viewed handmade preferences.",
      products: recommended,
      tone: "personal"
    });
  }

  if (recentlyViewed.length > 0) {
    sections.push({
      id: "recent",
      title: "Recently viewed",
      description: "Jump back into pieces you were already exploring.",
      products: recentlyViewed,
      tone: "memory"
    });
  }

  sections.push({
    id: experiments.homeFeed === "atelier" ? "atelier-edit" : "treasure-edit",
    title: experiments.homeFeed === "atelier" ? "Atelier edit" : "Treasury edit",
    description:
      experiments.homeFeed === "atelier"
        ? "A refined feed with quality-led ranking, boutique styling, and seller craftsmanship cues."
        : "A discovery-led feed tuned for variety, hidden gems, and high-intent browsing momentum.",
    products: experiments.homeFeed === "atelier" ? trusted : rankedProducts.slice(0, 4),
    tone: experiments.homeFeed === "atelier" ? "editorial" : "discovery"
  });

  if (deals.length > 0) {
    sections.push({
      id: "deals",
      title: "Deal timers and price drops",
      description: "Pieces with active markdowns, timing pressure, or coupon-ready pricing.",
      products: deals,
      tone: "offer"
    });
  }

  return sections;
}

export function buildMarketplaceHomeExperience({
  products,
  engagement,
  experiments
}: {
  products: Product[];
  engagement: EngagementSnapshot;
  experiments: ExperimentAssignments;
}): MarketplaceHomeExperience {
  const rankedProducts = rankProductsForVariant(products, experiments.searchRanking);
  const recentlyViewed = selectProductsByIds(rankedProducts, engagement.recentlyViewedIds);
  const referenceProduct = recentlyViewed[0] ?? rankedProducts[0];

  return {
    engagement,
    sections: buildHomeSections(rankedProducts, engagement, experiments),
    similarProducts: referenceProduct ? getSimilarProducts(rankedProducts, referenceProduct, 4) : [],
    alerts: buildAlertSubscriptions(products, engagement),
    experiments
  };
}

function buildAnalyticsSummary(orders: MarketplaceOrder[]): AnalyticsSummary {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total, 0);
  const distinctBuyers = new Set(orders.map((order) => order.buyerId));
  const repeatBuyers = Array.from(distinctBuyers).filter((buyerId) => {
    return orders.filter((order) => order.buyerId === buyerId).length > 1;
  });
  const visitors = Math.max(orders.length * 19, 120);
  const galleryViews = visitors;
  const productViews = Math.max(Math.round(visitors * 0.58), orders.length * 5);
  const wishlist = Math.max(Math.round(productViews * 0.32), orders.length * 3);
  const checkoutIntent = Math.max(Math.round(wishlist * 0.55), orders.length * 2);

  return {
    conversionRate: visitors > 0 ? Number(((orders.length / visitors) * 100).toFixed(1)) : 0,
    repeatPurchaseRate:
      distinctBuyers.size > 0
        ? Number(((repeatBuyers.length / distinctBuyers.size) * 100).toFixed(1))
        : 0,
    averageOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
    dropOffByStep: [
      { label: "Gallery views", users: galleryViews, dropOffRate: 0 },
      {
        label: "Product views",
        users: productViews,
        dropOffRate: Number((((galleryViews - productViews) / galleryViews) * 100).toFixed(1))
      },
      {
        label: "Wishlist / save",
        users: wishlist,
        dropOffRate: Number((((productViews - wishlist) / productViews) * 100).toFixed(1))
      },
      {
        label: "Checkout intent",
        users: checkoutIntent,
        dropOffRate: Number((((wishlist - checkoutIntent) / wishlist) * 100).toFixed(1))
      },
      {
        label: "Orders placed",
        users: orders.length,
        dropOffRate:
          checkoutIntent > 0
            ? Number((((checkoutIntent - orders.length) / checkoutIntent) * 100).toFixed(1))
            : 0
      }
    ],
    repeatPurchaseCohorts: [
      { label: "30-day repeat cohort", value: `${Math.max(repeatBuyers.length, 1)} buyers` },
      { label: "Top returning category", value: orders[0]?.items[0]?.productName ?? "Sweaters" },
      { label: "Preferred care journey", value: "Guided support + tracked refunds" }
    ],
    shareToOrderConversionRate: 0,
    telemetryEventsCaptured: 0
  };
}

function normalizeRiskLevel(levels: RiskLevel[]) {
  if (levels.includes("high")) {
    return "high";
  }

  if (levels.includes("medium")) {
    return "medium";
  }

  return "low";
}

function buildPricingInsight(product: Product): PricingInsight {
  const suggestedPrice = product.qualityScore && product.qualityScore > 92 ? product.price + 180 : product.price;
  const recommendedCouponIds = mockCoupons
    .filter((coupon) => coupon.active && (coupon.sellerId === null || coupon.sellerId === product.sellerId))
    .filter((coupon) => (coupon.minimumOrderValue ?? 0) <= product.price)
    .map((coupon) => coupon.id);

  return {
    productId: product.id,
    productName: product.name,
    currentPrice: product.price,
    suggestedPrice,
    compareAtPrice: product.compareAtPrice ?? null,
    dealEndsAt: product.discountEndsAt ?? null,
    recommendedCouponIds,
    note:
      product.priceDropPercent && product.priceDropPercent >= 12
        ? "Active markdown already creates urgency. Stack only one gentle coupon to protect margin."
        : "Opportunity to test a lighter promotional nudge or a curated bundle coupon."
  };
}

function buildInventory(products: Product[]): InventoryItem[] {
  return products.map((product) => ({
    productId: product.id,
    productName: product.name,
    stockQuantity: product.stockQuantity ?? 0,
    reservedQuantity: product.reservedQuantity ?? 0,
    reorderThreshold: product.reorderThreshold ?? 2,
    status: product.status ?? deriveProductStatus(product.stockQuantity, product.reorderThreshold),
    backInStockSubscribers: product.backInStockSubscribers ?? 0
  }));
}

function buildGovernance(sellerId: string, products: Product[], orders: MarketplaceOrder[]): SellerGovernance {
  const delayedShipments = orders.filter((order) => order.items.some(item => item.sellerId === sellerId && item.shippingStatus === "delayed")).length;
  const totalShipped = Math.max(orders.length, 1);
  const onTimeShipmentRate = Number((((totalShipped - delayedShipments) / totalShipped) * 100).toFixed(1));
  const cancelledOrders = orders.filter((order) => order.status === "refunded").length;
  const returnedOrders = orders.filter((order) => order.status === "refunded").length;
  const qualityScores = products.map((product) => product.qualityScore ?? 82);
  const catalogQualityScore =
    qualityScores.length > 0
      ? Math.round(qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length)
      : 80;
  const counterfeitRisk = normalizeRiskLevel(products.map((product) => product.counterfeitRisk ?? "low"));
  const flaggedCatalogIssues = [
    ...products
      .filter((product) => (product.status ?? "in_stock") === "out_of_stock")
      .map((product) => `${product.name}: stock is depleted while alerts remain active.`),
    ...products
      .filter((product) => (product.qualityScore ?? 100) < 90)
      .map((product) => `${product.name}: improve imagery or copy to lift catalog quality.`)
  ].slice(0, 4);
  const overallScore = Math.max(
    72,
    Math.round(onTimeShipmentRate * 0.45 + catalogQualityScore * 0.45 - delayedShipments * 3)
  );

  return {
    sellerId,
    overallScore,
    onTimeShipmentRate,
    lateShipmentPenalty: delayedShipments * 1.5,
    counterfeitRisk,
    catalogQualityScore,
    cancellationRate: Number(((cancelledOrders / totalShipped) * 100).toFixed(1)),
    returnRatio: Number(((returnedOrders / totalShipped) * 100).toFixed(1)),
    responseSlaHours: 3.2,
    flaggedCatalogIssues,
    qualityChecklist: [
      "Use at least one close-up texture shot for every premium yarn listing.",
      "Keep dispatch SLA accurate so late-shipment penalties stay low.",
      "Surface care instructions in the first two lines of the description.",
      "Review low-stock listings with active alerts before promotion windows end."
    ]
  };
}

export function getProductPriceHistory(productId: string) {
  return mockPriceHistory
    .filter((entry) => entry.productId === productId)
    .sort((left, right) => new Date(left.recordedAt).getTime() - new Date(right.recordedAt).getTime());
}

export function buildSellerOperationsSnapshot(
  sellerId: string,
  sellerProducts: Product[],
  providedOrders?: MarketplaceOrder[],
  analyticsOverride?: AnalyticsSummary
): SellerOperationsSnapshot {
  const orders = providedOrders ?? mockOrders.filter((order) => order.items.some(item => item.sellerId === sellerId));
  const inventory = buildInventory(sellerProducts);
  const governance = buildGovernance(sellerId, sellerProducts, orders);
  const pricingInsights = sellerProducts.slice(0, 4).map((product) => buildPricingInsight(product));
  const analytics = analyticsOverride ?? buildAnalyticsSummary(orders);
  const coupons = mockCoupons.filter((coupon) => coupon.active && (coupon.sellerId === null || coupon.sellerId === sellerId));

  return {
    inventory,
    orders,
    governance,
    pricingInsights,
    analytics,
    coupons
  };
}

export function buildBuyerPortalSnapshot(
  products: Product[],
  engagement: EngagementSnapshot,
  buyerId = "buyer-royal"
): BuyerPortalSnapshot {
  const wishlistProducts = selectProductsByIds(products, engagement.wishlistIds);
  const savedForLaterProducts = selectProductsByIds(products, engagement.savedForLaterIds);

  return {
    engagement,
    wishlistProducts,
    savedForLaterProducts,
    alerts: buildAlertSubscriptions(products, engagement),
    orders: mockOrders.filter((order) => order.buyerId === buyerId),
    cart: {
      items: [],
      subtotal: 0,
      shippingFee: 0,
      discountTotal: 0,
      total: 0,
      estimatedDeliveryLabel: "Add products to see delivery estimates"
    },
    returns: mockReturnRequests.filter((entry) => entry.buyerId === buyerId),
    supportCases: mockSupportCases.filter((entry) => entry.buyerId === buyerId),
    protection: buyerProtectionPolicy
  };
}
