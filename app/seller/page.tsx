import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/env";
import { getSellerProfile } from "@/lib/profiles";
import { getSellerProducts } from "@/lib/products";
import { LiveSellerPortal } from "./live-seller-portal";

import { getSellerOrders } from "@/lib/orders";
import { getCachedSellerMetrics } from "@/lib/seller-metrics";

export const dynamic = "force-dynamic";

export default async function SellerPage() {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    // Mock user for local testing when Clerk is disabled
    userId = "mock-seller-id";
  }

  if (!userId) redirect("/sign-in");

  const sellerInfo = await getSellerProfile(userId);
  let products: any[] = [];
  let orders: any[] = [];
  let sellerMetrics = null;
  
  if (sellerInfo) {
    const { products: fetchedProducts } = await getSellerProducts(sellerInfo.sellerId);
    products = fetchedProducts;
    orders = await getSellerOrders(sellerInfo.sellerId);
    sellerMetrics = await getCachedSellerMetrics(sellerInfo.sellerId);
  }

  return (
    <LiveSellerPortal
      sellerInfo={sellerInfo}
      initialProducts={products}
      initialOrders={orders}
      sellerMetrics={sellerMetrics}
    />
  );
}
