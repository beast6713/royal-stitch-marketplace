import { auth, currentUser } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/env";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getUserAvatarUrl, getUserDisplayName, getUserPrimaryEmail } from "@/lib/auth";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import { createRequestContext, logError, logInfo, logWarn } from "@/lib/logger";
import { updateSellerOrderStatus } from "@/lib/orders";
import { ensureMarketplaceProfile, getSellerProfile } from "@/lib/profiles";

export const runtime = "nodejs";

const payloadSchema = z.object({
  status: z.enum(["label_created", "in_transit", "out_for_delivery", "delivered", "delayed"])
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ orderId: string }> }
) {
  const requestContext = createRequestContext(request);

  if (!isClerkConfigured()) {
    return NextResponse.json({ error: "Clerk is not configured." }, { status: 503 });
  }

  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) {
    return NextResponse.json({ error: "Please sign in as a seller." }, { status: 401 });
  }

  let clerkUser = null;
  if (isClerkConfigured()) {
    clerkUser = await currentUser();
  }

  if (!clerkUser && isClerkConfigured()) {
    return NextResponse.json({ error: "Unable to load the signed-in user." }, { status: 401 });
  }

  const profile = await ensureMarketplaceProfile({
    sellerClerkId: userId,
    fullName: getUserDisplayName(clerkUser),
    email: getUserPrimaryEmail(clerkUser),
    avatarUrl: getUserAvatarUrl(clerkUser)
  });

  if (profile.role !== "seller") {
    logWarn("api.orders.forbidden", "Non-seller attempted to update order status.", {
      ...requestContext,
      userId
    });
    return NextResponse.json({ error: "Only seller accounts can update orders." }, { status: 403 });
  }

  const sellerInfo = await getSellerProfile(userId);

  if (!sellerInfo) {
    return NextResponse.json({ error: "Seller profile not found." }, { status: 404 });
  }

  let payload: z.infer<typeof payloadSchema>;

  try {
    payload = payloadSchema.parse(await request.json());
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Invalid order payload."
      },
      { status: 400 }
    );
  }

  const { orderId } = await context.params;

  try {
    const order = await updateSellerOrderStatus({
      orderItemId: orderId,
      sellerId: sellerInfo.sellerId,
      nextStatus: payload.status
    });
    revalidatePath("/seller");
    revalidatePath("/orders");
    logInfo("api.orders.updated", "Seller updated order status.", {
      ...requestContext,
      userId,
      orderId,
      status: payload.status
    });
    return NextResponse.json({ order });
  } catch (error) {
    logError("api.orders.failed", "Unable to update order status.", error, {
      ...requestContext,
      userId,
      orderId
    });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update order status."
      },
      { status: 500 }
    );
  }
}
