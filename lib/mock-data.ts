import type {
  BuyerProtectionPolicy,
  Coupon,
  MarketplaceOrder,
  PriceHistoryPoint,
  ProductReview,
  Product,
  ReturnRequest,
  SupportCase
} from "@/lib/types";

export const mockProducts: Product[] = [
  {
    id: "demo-1",
    name: "Velvet Bloom Cardigan",
    description:
      "A soft hand-crocheted cardigan with a romantic drape, scalloped cuffs, and a boutique finish for cool evenings.",
    price: 2490,
    compareAtPrice: 2890,
    material: "Wool",
    category: "Sweaters",
    yarnType: "Merino wool blend",
    imageUrl:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-a",
    sellerName: "Oak & Loop Studio",
    handmade: true,
    createdAt: "2026-04-01T09:00:00.000Z",
    stockQuantity: 6,
    reservedQuantity: 1,
    reorderThreshold: 3,
    status: "in_stock",
    averageRating: 4.9,
    reviewCount: 42,
    discountEndsAt: "2026-04-20T23:59:59.000Z",
    qualityScore: 96,
    counterfeitRisk: "low",
    priceDropPercent: 14,
    backInStockSubscribers: 5,
    tags: ["luxury", "cardigan", "evening", "soft-touch"],
    codAvailable: true,
    estimatedDispatchDays: 2,
    trendLabel: "Royal pick",
    cityTrendLabel: "Trending in Jaipur",
    unitsSoldToday: 12
  },
  {
    id: "demo-2",
    name: "Moonbeam Bunny",
    description:
      "A cuddly amigurumi rabbit with hand-stitched floral details, perfect for nursery shelves and thoughtful gifting.",
    price: 1290,
    compareAtPrice: 1490,
    material: "Cotton",
    category: "Amigurumi",
    yarnType: "Combed cotton yarn",
    imageUrl:
      "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-b",
    sellerName: "Twine & Charm",
    handmade: true,
    createdAt: "2026-04-02T10:30:00.000Z",
    stockQuantity: 0,
    reservedQuantity: 0,
    reorderThreshold: 2,
    status: "out_of_stock",
    averageRating: 4.8,
    reviewCount: 31,
    discountEndsAt: "2026-04-16T23:59:59.000Z",
    qualityScore: 91,
    counterfeitRisk: "low",
    priceDropPercent: 13,
    backInStockSubscribers: 14,
    tags: ["giftable", "nursery", "rabbit", "soft-toy"],
    codAvailable: true,
    estimatedDispatchDays: 1,
    trendLabel: "Gift favorite",
    cityTrendLabel: "Trending in Pune",
    unitsSoldToday: 21
  },
  {
    id: "demo-3",
    name: "Heirloom Cable Throw",
    description:
      "An oversized knitted blanket with rich texture and warm ivory tones designed to elevate beds, sofas, and reading corners.",
    price: 3290,
    compareAtPrice: 3890,
    material: "Acrylic",
    category: "Blankets",
    yarnType: "Chunky acrylic boucle",
    imageUrl:
      "https://images.unsplash.com/photo-1600369672770-985fd30004eb?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-c",
    sellerName: "Golden Knot House",
    handmade: true,
    createdAt: "2026-04-03T07:45:00.000Z",
    stockQuantity: 3,
    reservedQuantity: 1,
    reorderThreshold: 4,
    status: "low_stock",
    averageRating: 4.7,
    reviewCount: 18,
    discountEndsAt: "2026-04-12T23:59:59.000Z",
    qualityScore: 88,
    counterfeitRisk: "medium",
    priceDropPercent: 15,
    backInStockSubscribers: 9,
    tags: ["blanket", "sofa", "heritage", "cozy-home"],
    codAvailable: false,
    estimatedDispatchDays: 3,
    trendLabel: "Home luxe",
    cityTrendLabel: "Trending in Bengaluru",
    unitsSoldToday: 8
  },
  {
    id: "demo-4",
    name: "Forest Crest Pullover",
    description:
      "A contemporary knitted sweater with relaxed shoulders, lofty stitches, and a rich emerald palette for cooler days.",
    price: 2890,
    compareAtPrice: null,
    material: "Wool",
    category: "Sweaters",
    yarnType: "Brushed alpaca wool",
    imageUrl:
      "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-a",
    sellerName: "Oak & Loop Studio",
    handmade: true,
    createdAt: "2026-04-04T08:15:00.000Z",
    stockQuantity: 8,
    reservedQuantity: 2,
    reorderThreshold: 3,
    status: "in_stock",
    averageRating: 4.9,
    reviewCount: 27,
    discountEndsAt: null,
    qualityScore: 94,
    counterfeitRisk: "low",
    priceDropPercent: null,
    backInStockSubscribers: 3,
    tags: ["emerald", "winter", "fashion", "pullover"],
    codAvailable: true,
    estimatedDispatchDays: 2,
    trendLabel: "Top rated",
    cityTrendLabel: "Trending in Delhi",
    unitsSoldToday: 9
  },
  {
    id: "demo-5",
    name: "Pocket Panda Friend",
    description:
      "A miniature panda amigurumi with tiny stitched paws and a collector-friendly size that fits perfectly on desks.",
    price: 990,
    compareAtPrice: 1190,
    material: "Acrylic",
    category: "Amigurumi",
    yarnType: "Soft anti-pill acrylic",
    imageUrl:
      "https://images.unsplash.com/photo-1582562124811-c09040d0a901?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-b",
    sellerName: "Twine & Charm",
    handmade: true,
    createdAt: "2026-04-05T13:20:00.000Z",
    stockQuantity: 12,
    reservedQuantity: 1,
    reorderThreshold: 4,
    status: "in_stock",
    averageRating: 4.6,
    reviewCount: 53,
    discountEndsAt: "2026-04-14T23:59:59.000Z",
    qualityScore: 86,
    counterfeitRisk: "low",
    priceDropPercent: 17,
    backInStockSubscribers: 6,
    tags: ["desk-buddy", "miniature", "gift", "panda"],
    codAvailable: true,
    estimatedDispatchDays: 1,
    trendLabel: "Lowest price store",
    cityTrendLabel: "Trending in Indore",
    unitsSoldToday: 34
  },
  {
    id: "demo-6",
    name: "Rosewood Picnic Blanket",
    description:
      "A color-blocked crochet blanket with a warm rosewood palette and a dense stitch pattern that feels luxe and durable.",
    price: 3590,
    compareAtPrice: 3990,
    material: "Cotton",
    category: "Blankets",
    yarnType: "Recycled cotton cord",
    imageUrl:
      "https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-c",
    sellerName: "Golden Knot House",
    handmade: true,
    createdAt: "2026-04-05T17:00:00.000Z",
    stockQuantity: 2,
    reservedQuantity: 1,
    reorderThreshold: 3,
    status: "low_stock",
    averageRating: 4.8,
    reviewCount: 22,
    discountEndsAt: "2026-04-18T23:59:59.000Z",
    qualityScore: 92,
    counterfeitRisk: "medium",
    priceDropPercent: 10,
    backInStockSubscribers: 11,
    tags: ["picnic", "outdoor", "rosewood", "statement-home"],
    codAvailable: false,
    estimatedDispatchDays: 3,
    trendLabel: "Daily deal",
    cityTrendLabel: "Trending in Mumbai",
    unitsSoldToday: 6
  },
  {
    id: "demo-7",
    name: "Pearl Lattice Sweater",
    description:
      "An airy crochet sweater with pearl lattice sleeves, made to stand out in curated wardrobes and festive edits.",
    price: 2690,
    compareAtPrice: 3190,
    material: "Cotton",
    category: "Sweaters",
    yarnType: "Mercerized cotton",
    imageUrl:
      "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-d",
    sellerName: "Atelier Purl",
    handmade: true,
    createdAt: "2026-04-06T05:30:00.000Z",
    stockQuantity: 7,
    reservedQuantity: 2,
    reorderThreshold: 3,
    status: "in_stock",
    averageRating: 4.9,
    reviewCount: 29,
    discountEndsAt: "2026-04-22T23:59:59.000Z",
    qualityScore: 95,
    counterfeitRisk: "low",
    priceDropPercent: 16,
    backInStockSubscribers: 4,
    tags: ["festive", "airy", "lattice", "wardrobe"],
    codAvailable: true,
    estimatedDispatchDays: 2,
    trendLabel: "Festival trend",
    cityTrendLabel: "Trending in Hyderabad",
    unitsSoldToday: 14
  },
  {
    id: "demo-8",
    name: "Celestial Cub Set",
    description:
      "A pair of moon-inspired amigurumi cubs with embroidered constellations, crafted for keepsake gifting and decor.",
    price: 1490,
    compareAtPrice: 1690,
    material: "Wool",
    category: "Amigurumi",
    yarnType: "Baby wool fleece",
    imageUrl:
      "https://images.unsplash.com/photo-1604176354204-9268737828e4?auto=format&fit=crop&w=1200&q=80",
    sellerId: "demo-seller-d",
    sellerName: "Atelier Purl",
    handmade: true,
    createdAt: "2026-04-06T07:10:00.000Z",
    stockQuantity: 0,
    reservedQuantity: 0,
    reorderThreshold: 2,
    status: "out_of_stock",
    averageRating: 4.7,
    reviewCount: 17,
    discountEndsAt: "2026-04-15T23:59:59.000Z",
    qualityScore: 89,
    counterfeitRisk: "low",
    priceDropPercent: 12,
    backInStockSubscribers: 18,
    tags: ["celestial", "giftable", "collectible", "moon"],
    codAvailable: true,
    estimatedDispatchDays: 2,
    trendLabel: "Fast moving",
    cityTrendLabel: "Trending in Lucknow",
    unitsSoldToday: 17
  }
];

export const mockPriceHistory: PriceHistoryPoint[] = [
  { productId: "demo-1", price: 2890, compareAtPrice: 3090, recordedAt: "2026-03-10T00:00:00.000Z" },
  { productId: "demo-1", price: 2690, compareAtPrice: 2990, recordedAt: "2026-03-18T00:00:00.000Z" },
  { productId: "demo-1", price: 2490, compareAtPrice: 2890, recordedAt: "2026-04-01T00:00:00.000Z" },
  { productId: "demo-2", price: 1490, compareAtPrice: 1590, recordedAt: "2026-03-12T00:00:00.000Z" },
  { productId: "demo-2", price: 1390, compareAtPrice: 1490, recordedAt: "2026-03-22T00:00:00.000Z" },
  { productId: "demo-2", price: 1290, compareAtPrice: 1490, recordedAt: "2026-04-02T00:00:00.000Z" },
  { productId: "demo-3", price: 3590, compareAtPrice: 3990, recordedAt: "2026-03-14T00:00:00.000Z" },
  { productId: "demo-3", price: 3490, compareAtPrice: 3990, recordedAt: "2026-03-26T00:00:00.000Z" },
  { productId: "demo-3", price: 3290, compareAtPrice: 3890, recordedAt: "2026-04-03T00:00:00.000Z" },
  { productId: "demo-6", price: 3890, compareAtPrice: 4190, recordedAt: "2026-03-16T00:00:00.000Z" },
  { productId: "demo-6", price: 3690, compareAtPrice: 4090, recordedAt: "2026-03-28T00:00:00.000Z" },
  { productId: "demo-6", price: 3590, compareAtPrice: 3990, recordedAt: "2026-04-05T00:00:00.000Z" }
];

export const mockCoupons: Coupon[] = [
  {
    id: "coupon-1",
    sellerId: null,
    code: "WELCOME10",
    label: "First order charm",
    discountType: "percent",
    discountValue: 10,
    stackable: true,
    minimumOrderValue: 1500,
    active: true,
    startsAt: "2026-04-01T00:00:00.000Z",
    endsAt: "2026-04-30T23:59:59.000Z"
  },
  {
    id: "coupon-2",
    sellerId: "demo-seller-a",
    code: "LOOMLOVE15",
    label: "Studio loyalty reward",
    discountType: "percent",
    discountValue: 15,
    stackable: false,
    minimumOrderValue: 2200,
    active: true,
    startsAt: "2026-04-05T00:00:00.000Z",
    endsAt: "2026-04-20T23:59:59.000Z"
  },
  {
    id: "coupon-3",
    sellerId: "demo-seller-c",
    code: "BLANKET250",
    label: "Blanket bundle boost",
    discountType: "flat",
    discountValue: 250,
    stackable: true,
    minimumOrderValue: 3000,
    active: true,
    startsAt: "2026-04-01T00:00:00.000Z",
    endsAt: "2026-04-12T23:59:59.000Z"
  }
];

export const mockOrders: MarketplaceOrder[] = [
  {
    id: "order-1001",
    buyerId: "buyer-royal",
    buyerName: "Aarohi Singh",
    status: "shipped",
    subtotal: 2490,
    shippingFee: 149,
    total: 2639,
    createdAt: "2026-04-04T10:00:00.000Z",
    items: [
      {
        id: "order-1001-item-1",
        sellerId: "demo-seller-a",
        productId: "demo-1",
        productName: "Velvet Bloom Cardigan",
        quantity: 1,
        unitPrice: 2490,
        shippingStatus: "in_transit",
        trackingNumber: "RSM1001IN",
        courierName: "BlueDart",
        estimatedDeliveryAt: "2026-04-09T18:00:00.000Z",
        deliveredAt: null
      }
    ]
  },
  {
    id: "order-1002",
    buyerId: "buyer-royal",
    buyerName: "Aarohi Singh",
    status: "delivered",
    subtotal: 3590,
    shippingFee: 0,
    total: 3590,
    createdAt: "2026-03-26T11:00:00.000Z",
    items: [
      {
        id: "order-1002-item-1",
        sellerId: "demo-seller-c",
        productId: "demo-6",
        productName: "Rosewood Picnic Blanket",
        quantity: 1,
        unitPrice: 3590,
        shippingStatus: "delivered",
        trackingNumber: "RSM1002IN",
        courierName: "Delhivery",
        estimatedDeliveryAt: "2026-03-30T18:00:00.000Z",
        deliveredAt: "2026-03-30T14:00:00.000Z"
      }
    ]
  },
  {
    id: "order-1003",
    buyerId: "buyer-royal",
    buyerName: "Aarohi Singh",
    status: "refunded",
    subtotal: 990,
    shippingFee: 99,
    total: 1089,
    createdAt: "2026-03-18T09:30:00.000Z",
    items: [
      {
        id: "order-1003-item-1",
        sellerId: "demo-seller-b",
        productId: "demo-5",
        productName: "Pocket Panda Friend",
        quantity: 1,
        unitPrice: 990,
        shippingStatus: "delivered",
        trackingNumber: "RSM1003IN",
        courierName: "Ekart",
        estimatedDeliveryAt: "2026-03-22T18:00:00.000Z",
        deliveredAt: "2026-03-21T16:00:00.000Z"
      }
    ]
  },
  {
    id: "order-1004",
    buyerId: "buyer-repeat",
    buyerName: "Mira Kapoor",
    status: "paid",
    subtotal: 2890,
    shippingFee: 149,
    total: 3039,
    createdAt: "2026-04-05T15:00:00.000Z",
    items: [
      {
        id: "order-1004-item-1",
        sellerId: "demo-seller-a",
        productId: "demo-4",
        productName: "Forest Crest Pullover",
        quantity: 1,
        unitPrice: 2890,
        shippingStatus: "label_created",
        trackingNumber: "RSM1004IN",
        courierName: "XpressBees",
        estimatedDeliveryAt: "2026-04-11T18:00:00.000Z",
        deliveredAt: null
      }
    ]
  },
  {
    id: "order-1005",
    buyerId: "buyer-repeat",
    buyerName: "Mira Kapoor",
    status: "delivered",
    subtotal: 1490,
    shippingFee: 99,
    total: 1589,
    createdAt: "2026-03-25T13:00:00.000Z",
    items: [
      {
        id: "order-1005-item-1",
        sellerId: "demo-seller-d",
        productId: "demo-8",
        productName: "Celestial Cub Set",
        quantity: 1,
        unitPrice: 1490,
        shippingStatus: "delivered",
        trackingNumber: "RSM1005IN",
        courierName: "BlueDart",
        estimatedDeliveryAt: "2026-03-29T18:00:00.000Z",
        deliveredAt: "2026-03-28T13:00:00.000Z"
      }
    ]
  }
];

export const mockReturnRequests: ReturnRequest[] = [
  {
    id: "return-2001",
    orderId: "order-1003",
    buyerId: "buyer-royal",
    status: "refunded",
    refundStatus: "paid",
    reason: "Preferred a larger collector size for gifting.",
    openedAt: "2026-03-22T09:00:00.000Z",
    updatedAt: "2026-03-25T12:00:00.000Z"
  }
];

export const mockSupportCases: SupportCase[] = [
  {
    id: "case-3001",
    orderId: "order-1001",
    buyerId: "buyer-royal",
    sellerId: "demo-seller-a",
    caseType: "shipment",
    status: "in_review",
    title: "Proactive shipment reassurance",
    description:
      "Carrier scan slowed for 12 hours, so the marketplace opened a support thread automatically and messaged the buyer.",
    createdAt: "2026-04-06T07:45:00.000Z"
  },
  {
    id: "case-3002",
    orderId: "order-1003",
    buyerId: "buyer-royal",
    sellerId: "demo-seller-b",
    caseType: "return",
    status: "resolved",
    title: "Return approved within protection window",
    description:
      "Buyer protection covered the return, refund status was synced, and the issue was resolved without manual escalation.",
    createdAt: "2026-03-23T11:15:00.000Z"
  }
];

export const mockProductReviews: ProductReview[] = [
  {
    id: "review-1",
    productId: "demo-1",
    buyerId: "buyer-royal",
    buyerName: "Aarohi Singh",
    rating: 5,
    title: "Exactly the royal finish I wanted",
    body: "The cardigan drape is beautiful, the yarn feels premium, and it looked even better in natural light.",
    verifiedPurchase: true,
    mediaUrl:
      "https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=80",
    sizeInsight: "True to size with a relaxed fit",
    createdAt: "2026-04-05T10:30:00.000Z"
  },
  {
    id: "review-2",
    productId: "demo-5",
    buyerId: "buyer-repeat",
    buyerName: "Mira Kapoor",
    rating: 4,
    title: "Cute desk companion",
    body: "Small but very well finished. Good gifting price and the stitches were neat all around.",
    verifiedPurchase: true,
    mediaUrl: null,
    sizeInsight: "Compact miniature size",
    createdAt: "2026-04-02T08:30:00.000Z"
  },
  {
    id: "review-3",
    productId: "demo-6",
    buyerId: "buyer-repeat",
    buyerName: "Mira Kapoor",
    rating: 5,
    title: "Beautiful blanket for balcony mornings",
    body: "The color looks rich and the finish is dense. It feels like a statement decor piece rather than a basic blanket.",
    verifiedPurchase: true,
    mediaUrl:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
    sizeInsight: "Oversized throw feel",
    createdAt: "2026-04-01T06:30:00.000Z"
  }
];

export const buyerProtectionPolicy: BuyerProtectionPolicy = {
  title: "Royal buyer protection",
  description:
    "Every order stays covered with transparent return windows, tracked refunds, and escalation support if something feels off.",
  returnWindowDays: 7,
  highlights: [
    "Returns can be opened in a guided flow for eligible items within 7 days of delivery.",
    "Refund status stays visible from request to payout so buyers never lose context.",
    "Delayed shipments open proactive support threads before buyers need to chase help.",
    "Disputes are documented in a single timeline with seller, support, and marketplace actions."
  ]
};

export type MockSellerProfile = {
  id: string;
  shopName: string;
  sellerName: string;
  bio: string;
  location: string;
  profileImage: string;
  tags: string[];
  isVerified: boolean;
};

export function getSellerProfile(sellerId: string | null | undefined): MockSellerProfile {
  // Try to find the real seller name from our existing products
  const matchedProduct = mockProducts.find((p) => p.sellerId === sellerId);
  const resolvedName = matchedProduct ? matchedProduct.sellerName : "Local Craftsperson";
  const resolvedShop = matchedProduct ? matchedProduct.sellerName : "Local Handmade Studio";

  // Deterministically fake bio and tags based on sellerId length/chars so it stays consistent
  const hash = sellerId ? sellerId.charCodeAt(0) + sellerId.length : 1;
  const isVerified = hash % 3 !== 0; // 66% chance of being verified
  const locations = ["Jaipur, IN", "Mumbai, IN", "Bengaluru, IN", "Kochi, IN", "Ahmedabad, IN"];
  const location = locations[hash % locations.length] as string;

  return {
    id: sellerId ?? "anonymous-seller",
    shopName: resolvedShop,
    sellerName: resolvedName,
    bio: `Welcome to ${resolvedShop}! We specialize in hand-crafted, slowly made pieces designed to last a lifetime. Every item is stitched with care using premium local materials.`,
    location,
    profileImage: "https://images.unsplash.com/photo-1549490349-8643362247b5?auto=format&fit=crop&w=400&q=80",
    tags: ["sustainable", "handmade", "small-batch"],
    isVerified
  };
}
