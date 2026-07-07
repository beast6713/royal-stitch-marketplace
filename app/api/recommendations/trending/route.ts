import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createRequestContext, logError } from "@/lib/logger";
import { getTrendingProducts } from "@/lib/recommendations";

export const runtime = "nodejs";

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(24).default(8),
  windowDays: z.coerce.number().int().min(1).max(30).default(7)
});

export async function GET(request: NextRequest) {
  const requestContext = createRequestContext(request);
  const query = querySchema.parse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
    windowDays: request.nextUrl.searchParams.get("windowDays") ?? undefined
  });

  try {
    const products = await getTrendingProducts(query);
    return NextResponse.json({
      products,
      ranking: {
        formula: "views * 1 + add_to_cart * 4 + purchases * 12",
        windowDays: query.windowDays
      }
    });
  } catch (error) {
    logError("api.recommendations.trending.failed", "Unable to load trending product recommendations.", error, requestContext);
    return NextResponse.json({ error: "Unable to load trending products." }, { status: 500 });
  }
}
