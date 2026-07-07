import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("server-only", () => ({}));

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  currentUser: vi.fn(),
  isClerkConfigured: vi.fn(),
  normalizeProductFilters: vi.fn(),
  ensureMarketplaceProfile: vi.fn(),
  createProductListing: vi.fn(),
  getMarketplaceProducts: vi.fn(),
  hasSupabaseWriteConfig: vi.fn(),
  createRequestContext: vi.fn(),
  logInfo: vi.fn(),
  logWarn: vi.fn(),
  logError: vi.fn()
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.auth,
  currentUser: mocks.currentUser
}));

vi.mock("@/lib/env", () => ({
  isClerkConfigured: mocks.isClerkConfigured
}));

vi.mock("@/lib/product-core", () => ({
  normalizeProductFilters: mocks.normalizeProductFilters
}));

vi.mock("@/lib/profiles", () => ({
  ensureMarketplaceProfile: mocks.ensureMarketplaceProfile
}));

vi.mock("@/lib/products", () => ({
  createProductListing: mocks.createProductListing,
  getMarketplaceProducts: mocks.getMarketplaceProducts
}));

vi.mock("@/lib/supabase", () => ({
  hasSupabaseWriteConfig: mocks.hasSupabaseWriteConfig
}));

vi.mock("@/lib/logger", () => ({
  createRequestContext: mocks.createRequestContext,
  logInfo: mocks.logInfo,
  logWarn: mocks.logWarn,
  logError: mocks.logError
}));

async function loadRouteModule() {
  vi.resetModules();
  return import("@/app/api/products/route");
}

function makePostRequest(body: string) {
  return new NextRequest("http://localhost/api/products", {
    method: "POST",
    body,
    headers: {
      "Content-Type": "application/json",
      "x-request-id": "req_test"
    }
  });
}

function makeGetRequest() {
  return new NextRequest("http://localhost/api/products?query=blanket", {
    method: "GET",
    headers: {
      "x-request-id": "req_test"
    }
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.isClerkConfigured.mockReturnValue(true);
  mocks.hasSupabaseWriteConfig.mockReturnValue(true);
  mocks.auth.mockResolvedValue({ userId: "user_123" });
  mocks.currentUser.mockResolvedValue({
    firstName: "Asha",
    lastName: "Maker",
    imageUrl: "https://example.com/avatar.jpg",
    primaryEmailAddress: {
      emailAddress: "asha@example.com"
    }
  });
  mocks.ensureMarketplaceProfile.mockResolvedValue({
    sellerClerkId: "user_123",
    fullName: "Asha Maker",
    email: "asha@example.com",
    role: "seller",
    avatarUrl: "https://example.com/avatar.jpg"
  });
  mocks.createProductListing.mockResolvedValue({
    id: "product_123"
  });
  mocks.getMarketplaceProducts.mockResolvedValue({
    products: [],
    sourceState: "database"
  });
  mocks.normalizeProductFilters.mockReturnValue({
    query: "blanket",
    material: "",
    category: "",
    priceRange: "",
    rating: ""
  });
  mocks.createRequestContext.mockReturnValue({
    requestId: "req_test",
    route: "/api/products",
    pathname: "/api/products",
    method: "POST"
  });
});

describe("products API route", () => {
  it("returns 503 when Clerk is not configured", async () => {
    mocks.isClerkConfigured.mockReturnValue(false);
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{}"));

    expect(response.status).toBe(503);
  });

  it("returns 503 when Supabase admin access is missing", async () => {
    mocks.hasSupabaseWriteConfig.mockReturnValue(false);
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{}"));

    expect(response.status).toBe(503);
  });

  it("returns 401 when no user is signed in", async () => {
    mocks.auth.mockResolvedValue({ userId: null });
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{}"));

    expect(response.status).toBe(401);
  });

  it("returns 401 when Clerk cannot load the current user", async () => {
    mocks.currentUser.mockResolvedValue(null);
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{}"));

    expect(response.status).toBe(401);
  });

  it("returns 503 when marketplace profile sync fails", async () => {
    mocks.ensureMarketplaceProfile.mockRejectedValue(new Error("profile sync failed"));
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{}"));

    expect(response.status).toBe(503);
  });

  it("returns 403 for non-seller profiles", async () => {
    mocks.ensureMarketplaceProfile.mockResolvedValue({
      sellerClerkId: "user_123",
      fullName: "Asha Maker",
      email: "asha@example.com",
      role: "buyer",
      avatarUrl: "https://example.com/avatar.jpg"
    });
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{}"));

    expect(response.status).toBe(403);
  });

  it("returns 400 for invalid JSON payloads", async () => {
    const { POST } = await loadRouteModule();

    const response = await POST(makePostRequest("{invalid"));

    expect(response.status).toBe(400);
  });

  it("returns 400 when listing creation fails validation", async () => {
    mocks.createProductListing.mockRejectedValue(new Error("Description must be at least 20 characters long."));
    const { POST } = await loadRouteModule();

    const response = await POST(
      makePostRequest(
        JSON.stringify({
          name: "Short",
          description: "tiny",
          price: 100,
          material: "Wool",
          category: "Blankets",
          yarnType: "Merino",
          imageUrl: "https://example.com/image.jpg"
        })
      )
    );

    expect(response.status).toBe(400);
  });

  it("returns 503 on GET when marketplace data is degraded", async () => {
    mocks.getMarketplaceProducts.mockResolvedValue({
      products: [],
      sourceState: "error",
      errorMessage: "Live marketplace listings are temporarily unavailable."
    });
    mocks.createRequestContext.mockReturnValue({
      requestId: "req_test",
      route: "/api/products",
      pathname: "/api/products",
      method: "GET"
    });
    const { GET } = await loadRouteModule();

    const response = await GET(makeGetRequest());

    expect(response.status).toBe(503);
  });
});
