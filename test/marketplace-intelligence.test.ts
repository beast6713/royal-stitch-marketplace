import { describe, expect, it } from "vitest";
import { mockProducts } from "@/lib/mock-data";
import { resolveExperimentAssignments } from "@/lib/experiments";
import {
  buildBuyerPortalSnapshot,
  buildMarketplaceHomeExperience,
  buildSellerOperationsSnapshot
} from "@/lib/marketplace-intelligence";

const engagement = {
  wishlistIds: ["demo-1"],
  savedForLaterIds: ["demo-3"],
  backInStockAlertIds: ["demo-2"],
  priceDropAlertIds: ["demo-1"],
  recentlyViewedIds: ["demo-2", "demo-5"]
};

describe("marketplace intelligence", () => {
  it("assigns deterministic experiment buckets from the same seed", () => {
    expect(resolveExperimentAssignments("royal-seed")).toEqual(
      resolveExperimentAssignments("royal-seed")
    );
  });

  it("builds a personalized home experience with sections and alerts", () => {
    const experience = buildMarketplaceHomeExperience({
      products: mockProducts,
      engagement,
      experiments: {
        homeFeed: "atelier",
        searchRanking: "trend",
        checkoutFunnel: "guided"
      }
    });

    expect(experience.sections.length).toBeGreaterThan(1);
    expect(experience.sections.some((section) => section.id === "recent")).toBe(true);
    expect(experience.alerts).toHaveLength(2);
    expect(experience.similarProducts.length).toBeGreaterThan(0);
  });

  it("builds seller operations snapshots with scoped inventory and coupons", () => {
    const sellerProducts = mockProducts.filter((product) => product.sellerId === "demo-seller-a");
    const snapshot = buildSellerOperationsSnapshot("demo-seller-a", sellerProducts);

    expect(snapshot.inventory).toHaveLength(sellerProducts.length);
    expect(snapshot.coupons.some((coupon) => coupon.code === "LOOMLOVE15")).toBe(true);
    expect(snapshot.analytics.dropOffByStep.length).toBeGreaterThan(0);
  });

  it("builds the buyer portal snapshot from engagement signals", () => {
    const snapshot = buildBuyerPortalSnapshot(mockProducts, engagement);

    expect(snapshot.wishlistProducts[0]?.id).toBe("demo-1");
    expect(snapshot.savedForLaterProducts[0]?.id).toBe("demo-3");
    expect(snapshot.orders.length).toBeGreaterThan(0);
    expect(snapshot.supportCases.length).toBeGreaterThan(0);
  });
});
