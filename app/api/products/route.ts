import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/env";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getUserAvatarUrl, getUserDisplayName, getUserPrimaryEmail } from "@/lib/auth";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { normalizeProductFilters } from "@/lib/product-core";
import { ensureMarketplaceProfile } from "@/lib/profiles";
import { createProductListing, getMarketplaceProducts } from "@/lib/products";
import { checkRateLimit, getClientIp, rateLimitResponse } from "@/lib/rate-limit";
import { hasSupabaseWriteConfig } from "@/lib/supabase";

export const runtime = "nodejs";

function withRequestId(
  response: NextResponse,
  requestId: string
) {
  response.headers.set("x-request-id", requestId);
  return response;
}

export async function GET(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const filters = normalizeProductFilters(
    Object.fromEntries(request.nextUrl.searchParams.entries())
  );
  const page = Math.max(parseInt(request.nextUrl.searchParams.get("page") || "1", 10), 1);
  const limit = Math.min(
    Math.max(parseInt(request.nextUrl.searchParams.get("limit") || "12", 10), 1),
    48
  );
  const offset = (page - 1) * limit;
  const result = await getMarketplaceProducts(filters, requestContext, { limit, offset });

  if (result.sourceState === "error" || result.sourceState === "unconfigured") {
    logWarn(
      "api.products.get.degraded",
      "Marketplace product API returned a degraded-state response.",
      {
        ...requestContext,
        sourceState: result.sourceState
      }
    );
    return withRequestId(NextResponse.json(result, { status: 503 }), requestContext.requestId);
  }

  const categories: Record<string, number> = {};
  const materials: Record<string, number> = {};

  result.products.forEach(p => {
    if (p.category) categories[p.category] = (categories[p.category] || 0) + 1;
    if (p.material) materials[p.material] = (materials[p.material] || 0) + 1;
  });

  const total = result.total ?? result.products.length;
  const totalPages = Math.ceil(total / limit);

  return withRequestId(NextResponse.json({
    ...result,
    products: result.products,
    total,
    page,
    limit,
    totalPages,
    facets: {
      categories,
      materials
    }
  }), requestContext.requestId);
}

export async function POST(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const rateLimit = checkRateLimit({
    key: `products-post:${getClientIp(request.headers)}`,
    limit: 20,
    windowMs: 60_000
  });

  if (!rateLimit.allowed) {
    return rateLimitResponse(rateLimit.resetAt);
  }

  if (!isClerkConfigured()) {
    logWarn("api.products.post.unavailable", "Clerk is not configured for product publishing.", requestContext);
    return withRequestId(
      NextResponse.json(
        { error: "Clerk is not configured yet. Add auth keys to enable publishing." },
        { status: 503 }
      ),
      requestContext.requestId
    );
  }

  if (!hasSupabaseWriteConfig()) {
    logWarn(
      "api.products.post.unavailable",
      "Supabase admin access is not configured for product publishing.",
      requestContext
    );
    return withRequestId(
      NextResponse.json(
        { error: "Supabase admin access is not configured yet." },
        { status: 503 }
      ),
      requestContext.requestId
    );
  }

  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) {
    logWarn("api.products.post.unauthenticated", "Unauthenticated product publish attempt.", requestContext);
    return withRequestId(
      NextResponse.json({ error: "Please sign in to create a listing." }, { status: 401 }),
      requestContext.requestId
    );
  }

  let userDisplayName = "Local User";
  let userEmail = "local@example.com";
  let clerkUser = null;
  
  if (isClerkConfigured()) {
    clerkUser = await currentUser();
    if (clerkUser) {
      userDisplayName = getUserDisplayName(clerkUser);
      userEmail = getUserPrimaryEmail(clerkUser) ?? "unknown@example.com";
    }
  }

  if (!clerkUser && isClerkConfigured()) {
    logWarn(
      "api.products.post.user_missing",
      "Authenticated request did not return a Clerk user.",
      {
        ...requestContext,
        userId
      }
    );
    return withRequestId(
      NextResponse.json({ error: "Unable to load the signed-in user." }, { status: 401 }),
      requestContext.requestId
    );
  }

  let marketplaceProfile: Awaited<ReturnType<typeof ensureMarketplaceProfile>>;

  try {
    marketplaceProfile = await ensureMarketplaceProfile({
      sellerClerkId: userId,
      fullName: userDisplayName,
      email: userEmail,
      avatarUrl: clerkUser ? getUserAvatarUrl(clerkUser) : null
    });
  } catch (error) {
    logError(
      "api.products.post.profile_sync_failed",
      "Unable to load or sync the marketplace profile for product publishing.",
      error,
      {
        ...requestContext,
        userId
      }
    );
    return withRequestId(
      NextResponse.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Unable to load the marketplace profile for this user."
        },
        { status: 503 }
      ),
      requestContext.requestId
    );
  }

  if (marketplaceProfile.role !== "seller") {
    logWarn("api.products.post.forbidden", "Non-seller attempted to publish a product.", {
      ...requestContext,
      userId,
      role: marketplaceProfile.role
    });
    return withRequestId(
      NextResponse.json(
        { error: "Only seller accounts can publish products." },
        { status: 403 }
      ),
      requestContext.requestId
    );
  }

  let body: Record<string, unknown>;

  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    logWarn("api.products.post.bad_json", "Product publish request body could not be parsed.", {
      ...requestContext,
      userId
    });
    return withRequestId(
      NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 }),
      requestContext.requestId
    );
  }

  try {
    const product = await createProductListing(
      {
        name: String(body.name ?? ""),
        description: String(body.description ?? ""),
        price: Number(body.price ?? 0),
        material: String(body.material ?? ""),
        category: String(body.category ?? ""),
        yarnType: String(body.yarnType ?? ""),
        imageUrl: String(body.imageUrl ?? ""),
        compareAtPrice:
          body.compareAtPrice == null || body.compareAtPrice === ""
            ? null
            : Number(body.compareAtPrice),
        stockQuantity:
          body.stockQuantity == null || body.stockQuantity === ""
            ? undefined
            : Number(body.stockQuantity),
        reorderThreshold:
          body.reorderThreshold == null || body.reorderThreshold === ""
            ? undefined
            : Number(body.reorderThreshold),
        discountEndsAt:
          body.discountEndsAt == null ? null : String(body.discountEndsAt)
      },
      marketplaceProfile
    );

    logInfo("api.products.post.created", "Product listing created successfully.", {
      ...requestContext,
      userId,
      productId: product.id
    });
    revalidatePath("/");
    revalidatePath("/seller");
    revalidatePath(`/products/${product.id}`);
    return withRequestId(
      NextResponse.json({ product }, { status: 201 }),
      requestContext.requestId
    );
  } catch (error) {
    logError("api.products.post.failed", "Product publishing failed.", error, {
      ...requestContext,
      userId
    });
    return withRequestId(
      NextResponse.json(
        {
          error: error instanceof Error ? error.message : "Unable to create the product listing."
        },
        { status: 400 }
      ),
      requestContext.requestId
    );
  }
}
