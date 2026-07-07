import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";

export type Material = (typeof MATERIAL_OPTIONS)[number];
export type Category = (typeof CATEGORY_OPTIONS)[number];
export type UserRole = "buyer" | "seller" | "admin";
export type MarketplaceDataState = "database" | "demo" | "unconfigured" | "error";
export type ProductStatus = "in_stock" | "low_stock" | "out_of_stock" | "preorder";
export type RiskLevel = "low" | "medium" | "high";
export type AlertType = "back_in_stock" | "price_drop";
export type SignalType =
  | "wishlist"
  | "save_for_later"
  | "back_in_stock"
  | "price_drop"
  | "recently_viewed";
export type OrderStatus =
  | "pending"
  | "paid"
  | "shipped"
  | "delivered"
  | "refunded"
  | "cancelled"
  | "payment_failed";
export type ShippingStatus =
  | "pending"
  | "label_created"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "delayed"
  | "returned";
export type ReturnStatus = "requested" | "approved" | "picked_up" | "refunded" | "rejected";
export type RefundStatus = "not_started" | "in_review" | "processed" | "paid";
export type SupportCaseStatus = "open" | "in_review" | "resolved";
export type SupportCaseType = "protection" | "return" | "dispute" | "shipment";
export type DiscountType = "percent" | "flat";
export type PaymentMethod = "cod" | "upi" | "card";
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "paid"
  | "cod_due"
  | "failed"
  | "abandoned"
  | "refunded";
export type ExperimentVariant = "atelier" | "treasure";
export type RankingVariant = "relevance" | "trend";
export type FunnelVariant = "guided" | "express";
export type ShareChannel = "whatsapp" | "instagram" | "link";
export type PriceRangeFilter = "" | "under-1500" | "1500-3000" | "3000-plus";
export type RatingFilter = "" | "4-plus" | "4.5-plus";

export type Product = {
  id: string;
  name: string;
  description: string;
  price: number;
  material: Material;
  category: Category;
  yarnType: string;
  imageUrl: string;
  additionalImageUrls?: string[];
  sellerId: string;
  sellerName: string;
  handmade: boolean;
  createdAt: string;
  compareAtPrice?: number | null;
  stockQuantity?: number;
  reservedQuantity?: number;
  reorderThreshold?: number;
  status?: ProductStatus;
  averageRating?: number;
  reviewCount?: number;
  discountEndsAt?: string | null;
  qualityScore?: number;
  counterfeitRisk?: RiskLevel;
  priceDropPercent?: number | null;
  backInStockSubscribers?: number;
  tags?: string[];
  codAvailable?: boolean;
  estimatedDispatchDays?: number;
  trendLabel?: string | null;
  cityTrendLabel?: string | null;
  unitsSoldToday?: number;
};

export type ProductFilters = {
  query: string;
  material: Material | "";
  category: Category | "";
  priceRange: PriceRangeFilter;
  rating: RatingFilter;
};

export type ProductCreateInput = {
  name: string;
  description: string;
  price: number;
  material: string;
  category: string;
  yarnType: string;
  imageUrl: string;
  additionalImageUrls?: string[];
  compareAtPrice?: number | null;
  stockQuantity?: number;
  reorderThreshold?: number;
  discountEndsAt?: string | null;
};

export type MarketplaceProfile = {
  sellerClerkId: string;
  fullName: string;
  email: string | null;
  role: UserRole;
  avatarUrl: string | null;
};

export type ProductCollectionResult = {
  products: Product[];
  sourceState: MarketplaceDataState;
  errorMessage?: string;
  total?: number;
  page?: number;
  limit?: number;
};

export type EngagementSnapshot = {
  wishlistIds: string[];
  savedForLaterIds: string[];
  backInStockAlertIds: string[];
  priceDropAlertIds: string[];
  recentlyViewedIds: string[];
};

export type AlertSubscription = {
  productId: string;
  type: AlertType;
  label: string;
};

export type BuyerIdentity = {
  buyerId: string;
  buyerName: string;
  isAuthenticated: boolean;
};

export type HomeFeedSection = {
  id: string;
  title: string;
  description: string;
  products: Product[];
  tone: string;
};

export type ExperimentAssignments = {
  homeFeed: ExperimentVariant;
  searchRanking: RankingVariant;
  checkoutFunnel: FunnelVariant;
};

export type OrderItem = {
  id: string;
  sellerId: string;
  productId: string | null;
  productName: string;
  quantity: number;
  unitPrice: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  customMargin?: number;
  shippingStatus: ShippingStatus;
  trackingNumber?: string | null;
  courierName?: string | null;
  estimatedDeliveryAt?: string | null;
  deliveredAt?: string | null;
};

export type MarketplaceOrder = {
  id: string;
  buyerId: string;
  buyerName: string;
  status: OrderStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  createdAt: string;
  paymentMethod?: PaymentMethod;
  paymentStatus?: PaymentStatus;
  razorpayOrderId?: string | null;
  shareChannel?: ShareChannel | null;
  resellerMarginTotal?: number;
  items: OrderItem[];
};

export type CartItem = {
  id: string;
  buyerId: string;
  productId: string;
  quantity: number;
  selectedColor?: string | null;
  selectedSize?: string | null;
  customMargin?: number;
  savedForLater?: boolean;
  product: Product;
};

export type CartSnapshot = {
  items: CartItem[];
  subtotal: number;
  shippingFee: number;
  discountTotal: number;
  total: number;
  estimatedDeliveryLabel: string;
};

export type ReturnRequest = {
  id: string;
  orderId: string;
  buyerId: string;
  status: ReturnStatus;
  refundStatus: RefundStatus;
  reason: string;
  openedAt: string;
  updatedAt: string;
};

export type SupportCase = {
  id: string;
  orderId: string | null;
  buyerId: string;
  sellerId: string | null;
  caseType: SupportCaseType;
  status: SupportCaseStatus;
  title: string;
  description: string;
  createdAt: string;
};

export type PriceHistoryPoint = {
  productId: string;
  price: number;
  compareAtPrice: number | null;
  recordedAt: string;
};

export type Coupon = {
  id: string;
  sellerId: string | null;
  code: string;
  label: string;
  discountType: DiscountType;
  discountValue: number;
  stackable: boolean;
  minimumOrderValue: number | null;
  active: boolean;
  startsAt: string;
  endsAt: string;
};

export type ProductReview = {
  id: string;
  productId: string;
  buyerId: string;
  buyerName: string;
  rating: number;
  title: string;
  body: string;
  verifiedPurchase: boolean;
  mediaUrl?: string | null;
  sizeInsight?: string | null;
  createdAt: string;
};

export type ReviewSummary = {
  averageRating: number;
  totalReviews: number;
  verifiedPurchaseCount: number;
};

export type ShareDraft = {
  productId: string;
  channel: ShareChannel;
  margin: number;
  shareText: string;
  previewPrice: number;
};

export type PricingInsight = {
  productId: string;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  compareAtPrice: number | null;
  dealEndsAt: string | null;
  recommendedCouponIds: string[];
  note: string;
};

export type InventoryItem = {
  productId: string;
  productName: string;
  stockQuantity: number;
  reservedQuantity: number;
  reorderThreshold: number;
  status: ProductStatus;
  backInStockSubscribers: number;
};

export type SellerGovernance = {
  sellerId: string;
  overallScore: number;
  onTimeShipmentRate: number;
  lateShipmentPenalty: number;
  counterfeitRisk: RiskLevel;
  catalogQualityScore: number;
  cancellationRate: number;
  returnRatio: number;
  responseSlaHours: number;
  flaggedCatalogIssues: string[];
  qualityChecklist: string[];
};

export type FunnelStep = {
  label: string;
  users: number;
  dropOffRate: number;
};

export type CohortMetric = {
  label: string;
  value: string;
};

export type AnalyticsSummary = {
  conversionRate: number;
  repeatPurchaseRate: number;
  averageOrderValue: number;
  dropOffByStep: FunnelStep[];
  repeatPurchaseCohorts: CohortMetric[];
  shareToOrderConversionRate?: number;
  telemetryEventsCaptured?: number;
};

export type BuyerProtectionPolicy = {
  title: string;
  description: string;
  returnWindowDays: number;
  highlights: string[];
};

export type MarketplaceHomeExperience = {
  engagement: EngagementSnapshot;
  sections: HomeFeedSection[];
  similarProducts: Product[];
  alerts: AlertSubscription[];
  experiments: ExperimentAssignments;
};

export type TelemetryEvent = {
  id: string;
  buyerId: string | null;
  event: string;
  page: string;
  productId?: string | null;
  properties?: Record<string, string | number | boolean | null>;
  createdAt: string;
};

export type SellerOperationsSnapshot = {
  inventory: InventoryItem[];
  orders: MarketplaceOrder[];
  governance: SellerGovernance;
  pricingInsights: PricingInsight[];
  analytics: AnalyticsSummary;
  coupons: Coupon[];
};

export type BuyerPortalSnapshot = {
  engagement: EngagementSnapshot;
  wishlistProducts: Product[];
  savedForLaterProducts: Product[];
  alerts: AlertSubscription[];
  orders: MarketplaceOrder[];
  cart: CartSnapshot;
  returns: ReturnRequest[];
  supportCases: SupportCase[];
  protection: BuyerProtectionPolicy;
};
