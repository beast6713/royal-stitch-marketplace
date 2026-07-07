import { CATEGORY_OPTIONS, MATERIAL_OPTIONS } from "@/lib/constants";
import type {
  Category,
  Material,
  Product,
  ProductCreateInput,
  ProductFilters,
  PriceRangeFilter,
  RatingFilter,
  ProductStatus
} from "@/lib/types";

export type SearchParamsRecord = Record<string, string | string[] | undefined>;

export type ValidatedProductCreateInput = Omit<ProductCreateInput, "material" | "category"> & {
  material: Material;
  category: Category;
};

const SEARCH_SYNONYMS: Record<string, string[]> = {
  crochet: ["crocheted", "crochet", "handmade"],
  knit: ["knit", "knitted", "knitwear"],
  sweater: ["sweater", "pullover", "cardigan"],
  toy: ["toy", "amigurumi", "plush"],
  blanket: ["blanket", "throw", "quilt"],
  wool: ["wool", "merino", "alpaca"],
  cotton: ["cotton", "combed", "mercerized"],
  acrylic: ["acrylic", "anti-pill", "boucle"]
};

const PRICE_RANGE_OPTIONS = ["under-1500", "1500-3000", "3000-plus"] as const;
const RATING_OPTIONS = ["4-plus", "4.5-plus"] as const;

export function isMaterial(value: string): value is Material {
  return MATERIAL_OPTIONS.includes(value as Material);
}

export function isCategory(value: string): value is Category {
  return CATEGORY_OPTIONS.includes(value as Category);
}

export function isPriceRangeFilter(value: string): value is PriceRangeFilter {
  return (PRICE_RANGE_OPTIONS as readonly string[]).includes(value);
}

export function isRatingFilter(value: string): value is RatingFilter {
  return (RATING_OPTIONS as readonly string[]).includes(value);
}

export function getFirstSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function normalizeProductFilters(searchParams: SearchParamsRecord): ProductFilters {
  const material = getFirstSearchValue(searchParams.material).trim();
  const category = getFirstSearchValue(searchParams.category).trim();
  const priceRange = getFirstSearchValue(searchParams.price).trim();
  const rating = getFirstSearchValue(searchParams.rating).trim();

  return {
    query: getFirstSearchValue(searchParams.query).trim(),
    material: isMaterial(material) ? material : "",
    category: isCategory(category) ? category : "",
    priceRange: isPriceRangeFilter(priceRange) ? priceRange : "",
    rating: isRatingFilter(rating) ? rating : ""
  };
}

export function filterProducts(products: Product[], filters: ProductFilters) {
  const normalizedQuery = filters.query.trim().toLowerCase();
  const rankedProducts = normalizedQuery.length
    ? products
        .map((product) => ({
          product,
          score: scoreProductSearch(product, normalizedQuery)
        }))
        .filter((entry) => entry.score > 0)
        .sort((left, right) => right.score - left.score)
        .map((entry) => entry.product)
    : products;

  return rankedProducts.filter((product) => {
    const matchesMaterial = filters.material.length === 0 || product.material === filters.material;
    const matchesCategory = filters.category.length === 0 || product.category === filters.category;
    const averageRating = product.averageRating ?? 0;
    const matchesRating =
      filters.rating.length === 0 ||
      (filters.rating === "4-plus" && averageRating >= 4) ||
      (filters.rating === "4.5-plus" && averageRating >= 4.5);
    const matchesPrice =
      filters.priceRange.length === 0 ||
      (filters.priceRange === "under-1500" && product.price < 1500) ||
      (filters.priceRange === "1500-3000" && product.price >= 1500 && product.price < 3000) ||
      (filters.priceRange === "3000-plus" && product.price >= 3000);

    return matchesMaterial && matchesCategory && matchesRating && matchesPrice;
  });
}

function levenshteinDistance(left: string, right: string) {
  const matrix = Array.from({ length: left.length + 1 }, () =>
    new Array<number>(right.length + 1).fill(0)
  );

  for (let index = 0; index <= left.length; index += 1) {
    matrix[index]![0] = index;
  }

  for (let index = 0; index <= right.length; index += 1) {
    matrix[0]![index] = index;
  }

  for (let row = 1; row <= left.length; row += 1) {
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1;
      matrix[row]![column] = Math.min(
        matrix[row - 1]![column]! + 1,
        matrix[row]![column - 1]! + 1,
        matrix[row - 1]![column - 1]! + cost
      );
    }
  }

  return matrix[left.length]![right.length]!;
}

function expandSearchTokens(query: string) {
  const baseTokens = sanitizeSearchTerm(query)
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 6);

  return Array.from(
    new Set(
      baseTokens.flatMap((token) => {
        const synonymList = Object.entries(SEARCH_SYNONYMS).find(([key, values]) => {
          return key === token || values.includes(token);
        });

        return synonymList ? [token, synonymList[0], ...synonymList[1]] : [token];
      })
    )
  );
}

function tokenMatchesValue(token: string, rawValue: string) {
  const value = rawValue.toLowerCase();

  if (value.includes(token)) {
    return true;
  }

  return value
    .split(/\s+/)
    .filter(Boolean)
    .some((word) => Math.abs(word.length - token.length) <= 1 && levenshteinDistance(word, token) <= 1);
}

export function scoreProductSearch(product: Product, query: string) {
  const tokens = expandSearchTokens(query);

  if (tokens.length === 0) {
    return 0;
  }

  const score = tokens.reduce((total, token) => {
    let nextScore = total;

    if (tokenMatchesValue(token, product.name)) {
      nextScore += 14;
    }

    if (tokenMatchesValue(token, product.category)) {
      nextScore += 10;
    }

    if (tokenMatchesValue(token, product.material)) {
      nextScore += 9;
    }

    if (tokenMatchesValue(token, product.yarnType)) {
      nextScore += 8;
    }

    if (tokenMatchesValue(token, product.sellerName)) {
      nextScore += 6;
    }

    if (tokenMatchesValue(token, product.description)) {
      nextScore += 4;
    }

    if ((product.tags ?? []).some((tag) => tokenMatchesValue(token, tag))) {
      nextScore += 7;
    }

    return nextScore;
  }, 0);

  const reviewBoost = (product.averageRating ?? 0) * 2 + (product.reviewCount ?? 0) * 0.04;
  const dealBoost = (product.priceDropPercent ?? 0) * 0.8 + (product.discountEndsAt ? 2 : 0);
  const trustBoost = product.codAvailable ? 1.5 : 0;

  return score + reviewBoost + dealBoost + trustBoost;
}

export function deriveProductStatus(stockQuantity = 0, reorderThreshold = 2): ProductStatus {
  if (stockQuantity <= 0) {
    return "out_of_stock";
  }

  if (stockQuantity <= reorderThreshold) {
    return "low_stock";
  }

  return "in_stock";
}

export function getProductDiscountPercent(price: number, compareAtPrice?: number | null) {
  if (!compareAtPrice || compareAtPrice <= price) {
    return null;
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

export function isDealActive(discountEndsAt?: string | null) {
  if (!discountEndsAt) {
    return false;
  }

  const timestamp = Date.parse(discountEndsAt);
  return Number.isFinite(timestamp) && timestamp > Date.now();
}

export function sanitizeSearchTerm(query: string) {
  return query.replace(/[^a-zA-Z0-9\s-]/g, " ").replace(/\s+/g, " ").trim();
}

export function buildProductSearchFilter(query: string) {
  const tokens = sanitizeSearchTerm(query)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 2)
    .slice(0, 5);

  if (tokens.length === 0) {
    return null;
  }

  return tokens
    .flatMap((token) => [
      `name.ilike.%${token}%`,
      `description.ilike.%${token}%`,
      `seller_name.ilike.%${token}%`
    ])
    .join(",");
}

export function validateProductCreateInput(
  input: ProductCreateInput
): ValidatedProductCreateInput {
  const name = input.name.trim();
  const description = input.description.trim();
  const yarnType = input.yarnType.trim();
  const imageUrl = input.imageUrl.trim();
  const price = Number(input.price);
  const compareAtPrice =
    input.compareAtPrice == null ? null : Number(input.compareAtPrice);
  const stockQuantity = input.stockQuantity == null ? 0 : Number(input.stockQuantity);
  const reorderThreshold =
    input.reorderThreshold == null ? 2 : Number(input.reorderThreshold);
  const discountEndsAt = input.discountEndsAt?.trim() ? input.discountEndsAt.trim() : null;

  if (name.length < 3) {
    throw new Error("Product name must be at least 3 characters long.");
  }

  if (description.length < 20) {
    throw new Error("Description must be at least 20 characters long.");
  }

  if (!isMaterial(input.material)) {
    throw new Error("Select a valid material.");
  }

  if (!isCategory(input.category)) {
    throw new Error("Select a valid category.");
  }

  if (yarnType.length < 3) {
    throw new Error("Yarn type must be at least 3 characters long.");
  }

  if (!imageUrl.startsWith("http://") && !imageUrl.startsWith("https://")) {
    throw new Error("Image URL must start with http:// or https://");
  }

  if (!Number.isFinite(price) || price <= 0) {
    throw new Error("Price must be greater than zero.");
  }

  if (compareAtPrice !== null && (!Number.isFinite(compareAtPrice) || compareAtPrice <= price)) {
    throw new Error("Compare-at price must be higher than the selling price.");
  }

  if (!Number.isFinite(stockQuantity) || stockQuantity < 0) {
    throw new Error("Stock quantity cannot be negative.");
  }

  if (!Number.isFinite(reorderThreshold) || reorderThreshold < 0) {
    throw new Error("Reorder threshold cannot be negative.");
  }

  if (discountEndsAt) {
    const parsed = Date.parse(discountEndsAt);

    if (!Number.isFinite(parsed)) {
      throw new Error("Discount end date must be a valid date.");
    }
  }

  return {
    name,
    description,
    price: Math.round(price),
    material: input.material,
    category: input.category,
    yarnType,
    imageUrl,
    compareAtPrice: compareAtPrice === null ? null : Math.round(compareAtPrice),
    stockQuantity: Math.round(stockQuantity),
    reorderThreshold: Math.round(reorderThreshold),
    discountEndsAt
  };
}

export function shouldUseDemoMarketplaceData({
  hasReadConfig,
  nodeEnv,
  forceDemoMode
}: {
  hasReadConfig: boolean;
  nodeEnv?: string;
  forceDemoMode?: boolean;
}) {
  if (hasReadConfig) {
    return false;
  }

  if (forceDemoMode) {
    return true;
  }

  return (nodeEnv ?? "development") !== "production";
}
