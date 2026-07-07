import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";

export type DashboardTab = "overview" | "products" | "orders" | "analytics";
export type DemoSellerStatus = "Pending" | "Verified" | "Rejected";
export type DemoProductStatus = "Draft" | "Pending" | "Approved" | "Rejected";

export type DemoSellerRecord = {
  id: string;
  name: string;
  email: string;
  shopName: string;
  status: DemoSellerStatus;
  rejectionMessage?: string;
  submittedAt: string;
};

export type DemoSellerProduct = {
  id: string;
  sellerId: string;
  sellerName: string;
  imageUrl: string;
  additionalImageUrls?: string[];
  name: string;
  category: string;
  price: number;
  stock: number;
  status: DemoProductStatus;
  rejectionMessage?: string;
  sales: number;
  views: number;
  addToCartCount: number;
  material: string;
  yarnType: string;
  description: string;
  performance: "high" | "steady" | "low";
};

export type SellerOnboardingState = {
  fullName: string;
  email: string;
  phone: string;
  otp: string;
  password: string;
  businessType: "Individual" | "Small business";
  governmentIdFile: string;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  pickupAddress: string;
  portfolioLink: string;
  shopName: string;
  profileImage: string;
  bio: string;
  location: string;
  tags: string[];
  productTitle: string;
  productCategory: string;
  productPrice: string;
  productQuantity: string;
  productDescription: string;
  variantSizes: string;
  variantColors: string;
  customizable: boolean;
  productImages: string[];
  material: string;
  timeToMake: string;
  customizationOptions: string;
  dispatchTime: string;
  shippingCharges: string;
  deliveryRegions: string;
  acceptsReturnPolicy: boolean;
  acceptsRefundRules: boolean;
  acceptsQualityGuidelines: boolean;
};

export type SellerMetrics = {
  sales: number;
  orders: number;
  views: number;
  conversion: number;
};

export type DemoOrder = {
  id: string;
  productId: string;
  productName: string;
  sellerId: string;
  total: number;
  createdAt: string;
};

export const SELLER_STORAGE_KEY = "royal-stitch-demo-seller";
export const SELLERS_STORAGE_KEY = "royal-stitch-demo-sellers";
export const DEMO_ORDERS_STORAGE_KEY = "royal-stitch-demo-orders";
export const DEMO_SELLER_ID = "local-seller-primary";

export const onboardingSteps = [
  "Registration",
  "Verification",
  "Profile",
  "Product",
  "Shipping",
  "Policies"
] as const;

export const specializationTags = [
  "crochet toys",
  "sweaters",
  "home decor",
  "blankets",
  "custom gifts"
];

export const emptyOnboarding: SellerOnboardingState = {
  fullName: "",
  email: "",
  phone: "",
  otp: "",
  password: "",
  businessType: "Individual",
  governmentIdFile: "",
  bankName: "",
  accountNumber: "",
  ifsc: "",
  pickupAddress: "",
  portfolioLink: "",
  shopName: "",
  profileImage: "",
  bio: "",
  location: "",
  tags: [],
  productTitle: "",
  productCategory: CATEGORY_OPTIONS[0] ?? "Sweaters",
  productPrice: "",
  productQuantity: "1",
  productDescription: "",
  variantSizes: "",
  variantColors: "",
  customizable: false,
  productImages: [],
  material: MATERIAL_OPTIONS[0] ?? "Wool",
  timeToMake: "",
  customizationOptions: "",
  dispatchTime: "",
  shippingCharges: "",
  deliveryRegions: "",
  acceptsReturnPolicy: false,
  acceptsRefundRules: false,
  acceptsQualityGuidelines: false
};

export const starterProducts: DemoSellerProduct[] = [
  {
    id: "seller-demo-1",
    sellerId: DEMO_SELLER_ID,
    sellerName: "Oak & Loop Studio",
    imageUrl:
      "https://images.unsplash.com/photo-1620799140408-edc6dcb6d633?auto=format&fit=crop&w=500&q=80",
    name: "Velvet Bloom Cardigan",
    category: "Sweaters",
    price: 2490,
    stock: 6,
    status: "Approved",
    sales: 18,
    views: 840,
    addToCartCount: 92,
    material: "Wool",
    yarnType: "Chunky",
    description: "A cozy velvet bloom cardigan.",
    performance: "high"
  },
  {
    id: "seller-demo-2",
    sellerId: DEMO_SELLER_ID,
    sellerName: "Oak & Loop Studio",
    imageUrl:
      "https://images.unsplash.com/photo-1594040226829-7f251ab46d80?auto=format&fit=crop&w=500&q=80",
    name: "Moonbeam Bunny",
    category: "Amigurumi",
    price: 1290,
    stock: 0,
    status: "Approved",
    sales: 11,
    views: 510,
    addToCartCount: 55,
    material: "Cotton",
    yarnType: "Sport",
    description: "A cute little bunny.",
    performance: "steady"
  },
  {
    id: "seller-demo-3",
    sellerId: DEMO_SELLER_ID,
    sellerName: "Oak & Loop Studio",
    imageUrl:
      "https://images.unsplash.com/photo-1600369672770-985fd30004eb?auto=format&fit=crop&w=500&q=80",
    name: "Heirloom Cable Throw",
    category: "Blankets",
    price: 3290,
    stock: 2,
    status: "Approved",
    sales: 4,
    views: 390,
    addToCartCount: 21,
    material: "Acrylic",
    yarnType: "Worsted",
    description: "Heirloom cable throw.",
    performance: "low"
  }
];

export function createFirstDemoProduct(form: SellerOnboardingState): DemoSellerProduct {
  const quantity = Number(form.productQuantity || 0);

  return {
    id: `seller-${Date.now()}`,
    sellerId: DEMO_SELLER_ID,
    sellerName: form.shopName || form.fullName || "Local seller",
    imageUrl:
      "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&w=500&q=80",
    name: form.productTitle || "First Handmade Product",
    category: form.productCategory,
    price: Number(form.productPrice || 0),
    stock: quantity,
    status: "Pending",
    sales: 0,
    views: 0,
    addToCartCount: 0,
    material: form.material,
    yarnType: "Standard",
    description: form.productDescription || "No description provided.",
    performance: "steady"
  };
}

export function normalizeDemoProduct(product: Partial<DemoSellerProduct>): DemoSellerProduct {
  const legacyStatus = String(product.status ?? "Pending");
  const status: DemoProductStatus =
    legacyStatus === "active" || legacyStatus === "out of stock"
      ? "Approved"
      : legacyStatus === "draft"
        ? "Draft"
        : ["Draft", "Pending", "Approved", "Rejected"].includes(legacyStatus)
          ? (legacyStatus as DemoProductStatus)
          : "Pending";

  return {
    id: product.id ?? `seller-product-${Date.now()}`,
    sellerId: product.sellerId ?? DEMO_SELLER_ID,
    sellerName: product.sellerName ?? "Local seller",
    imageUrl:
      product.imageUrl ??
      "https://images.unsplash.com/photo-1584735175315-9d5df23860e6?auto=format&fit=crop&w=500&q=80",
    additionalImageUrls: product.additionalImageUrls ?? [],
    name: product.name ?? "Handmade product",
    category: product.category ?? "Sweaters",
    price: Number(product.price ?? 0),
    stock: Number(product.stock ?? 0),
    status,
    rejectionMessage: product.rejectionMessage,
    sales: Number(product.sales ?? 0),
    views: Number(product.views ?? 0),
    addToCartCount: Number(product.addToCartCount ?? 0),
    material: product.material ?? "Wool",
    yarnType: product.yarnType ?? "Standard",
    description: product.description ?? "",
    performance: product.performance ?? "steady"
  };
}

export function normalizeDemoProducts(products: Partial<DemoSellerProduct>[] = []) {
  return products.map((product) => normalizeDemoProduct(product));
}

export function createDemoSellerRecord(form: SellerOnboardingState): DemoSellerRecord {
  return {
    id: DEMO_SELLER_ID,
    name: form.fullName || "New seller",
    email: form.email || "seller@example.com",
    shopName: form.shopName || "New Royal Stitch Shop",
    status: "Pending",
    submittedAt: new Date().toISOString()
  };
}

export function calculateSellerMetrics(products: DemoSellerProduct[]): SellerMetrics {
  const approvedProducts = products.filter((product) => product.status === "Approved");
  const sales = approvedProducts.reduce((total, product) => total + product.sales * product.price, 0);
  const orders = approvedProducts.reduce((total, product) => total + product.sales, 0);
  const views = products.reduce((total, product) => total + product.views, 0);
  const conversion = views > 0 ? (orders / views) * 100 : 0;

  return {
    sales,
    orders,
    views,
    conversion
  };
}
