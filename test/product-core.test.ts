import { describe, expect, it } from "vitest";
import { mockProducts } from "@/lib/mock-data";
import {
  buildProductSearchFilter,
  filterProducts,
  normalizeProductFilters,
  sanitizeSearchTerm,
  shouldUseDemoMarketplaceData,
  validateProductCreateInput
} from "@/lib/product-core";

describe("product core helpers", () => {
  it("normalizes filters and ignores unsupported values", () => {
    expect(
      normalizeProductFilters({
        query: " blanket ",
        material: "Silk",
        category: "Blankets",
        price: "under-1500",
        rating: "4.5-plus"
      })
    ).toEqual({
      query: "blanket",
      material: "",
      category: "Blankets",
      priceRange: "under-1500",
      rating: "4.5-plus"
    });
  });

  it("filters products by query and category", () => {
    const filtered = filterProducts(mockProducts, {
      query: "panda",
      material: "",
      category: "Amigurumi",
      priceRange: "",
      rating: ""
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((product) => product.category === "Amigurumi")).toBe(true);
    expect(filtered[0]?.name).toBe("Pocket Panda Friend");
  });

  it("validates and trims product input", () => {
    expect(
      validateProductCreateInput({
        name: "  Cozy Throw  ",
        description: "  A hand-knitted throw with soft texture and warm neutral tones.  ",
        price: 1999.4,
        material: "Wool",
        category: "Blankets",
        yarnType: "  Merino blend  ",
        imageUrl: "https://example.com/throw.jpg"
      })
    ).toEqual({
      name: "Cozy Throw",
      description: "A hand-knitted throw with soft texture and warm neutral tones.",
      price: 1999,
      material: "Wool",
      category: "Blankets",
      yarnType: "Merino blend",
      imageUrl: "https://example.com/throw.jpg",
      compareAtPrice: null,
      stockQuantity: 0,
      reorderThreshold: 2,
      discountEndsAt: null
    });
  });

  it("only enables demo mode intentionally when production lacks read config", () => {
    expect(
      shouldUseDemoMarketplaceData({
        hasReadConfig: false,
        nodeEnv: "production",
        forceDemoMode: false
      })
    ).toBe(false);
    expect(
      shouldUseDemoMarketplaceData({
        hasReadConfig: false,
        nodeEnv: "development",
        forceDemoMode: false
      })
    ).toBe(true);
  });

  it("sanitizes search terms before sending them to Supabase", () => {
    expect(sanitizeSearchTerm("wool, blanket(soft)%")).toBe("wool blanket soft");
  });

  it("builds a bounded Supabase or-filter from safe tokens", () => {
    expect(buildProductSearchFilter("wool blanket soft throw cozy extra")).toBe(
      "name.ilike.%wool%,description.ilike.%wool%,seller_name.ilike.%wool%,name.ilike.%blanket%,description.ilike.%blanket%,seller_name.ilike.%blanket%,name.ilike.%soft%,description.ilike.%soft%,seller_name.ilike.%soft%,name.ilike.%throw%,description.ilike.%throw%,seller_name.ilike.%throw%,name.ilike.%cozy%,description.ilike.%cozy%,seller_name.ilike.%cozy%"
    );
  });

  it("rejects invalid product input", () => {
    expect(() =>
      validateProductCreateInput({
        name: "No",
        description: "short",
        price: 0,
        material: "Silk",
        category: "Other",
        yarnType: "x",
        imageUrl: "ftp://example.com/file.jpg"
      })
    ).toThrowError("Product name must be at least 3 characters long.");
  });

  it("supports price and rating refinement", () => {
    const filtered = filterProducts(mockProducts, {
      query: "",
      material: "",
      category: "",
      priceRange: "3000-plus",
      rating: "4.5-plus"
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.every((product) => product.price >= 3000)).toBe(true);
    expect(filtered.every((product) => (product.averageRating ?? 0) >= 4.5)).toBe(true);
  });
});
