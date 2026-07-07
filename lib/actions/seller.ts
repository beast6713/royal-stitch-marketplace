"use server";

import { auth } from "@clerk/nextjs/server";
import { isClerkConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getSellerProfile, getMarketplaceProfile } from "@/lib/profiles";
import { revalidatePath } from "next/cache";

export async function deleteProduct(productId: string) {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) throw new Error("Unauthorized");

  const profile = await getMarketplaceProfile(userId);
  if (!profile) throw new Error("Profile not found");

  const supabase = getSupabaseAdminClient();

  if (profile.role === "admin") {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) throw new Error(error.message);
  } else {
    const sellerInfo = await getSellerProfile(userId);
    if (!sellerInfo) throw new Error("Seller profile not found");
    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productId)
      .eq("seller_id", sellerInfo.sellerId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/seller");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export async function updateProduct(productId: string, updates: any) {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) throw new Error("Unauthorized");

  const profile = await getMarketplaceProfile(userId);
  if (!profile) throw new Error("Profile not found");

  const supabase = getSupabaseAdminClient();

  let targetProductId = productId;

  if (profile.role === "admin") {
    const { error } = await supabase.from("products").update(updates).eq("id", productId);
    if (error) throw new Error(error.message);
  } else {
    const sellerInfo = await getSellerProfile(userId);
    if (!sellerInfo) throw new Error("Seller profile not found");
    
    // For sellers, ensure they only update their own
    const { error, data } = await supabase
      .from("products")
      .update(updates)
      .eq("id", productId)
      .eq("seller_id", sellerInfo.sellerId)
      .select("id")
      .single();
      
    if (error) throw new Error(error.message);
    if (!data) throw new Error("Product not found or unauthorized");
  }

  revalidatePath("/seller");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

export async function createSeller(form: any) {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) throw new Error("Unauthorized");

  const profile = await getMarketplaceProfile(userId);
  if (!profile) throw new Error("Profile not found");

  const supabase = getSupabaseAdminClient();

  if (profile.role === "buyer") {
    await supabase.from("profiles").update({ role: "seller" }).eq("clerk_user_id", userId);
  }

  const { data: p } = await supabase.from("profiles").select("id").eq("clerk_user_id", userId).single();
  if (!p) throw new Error("Profile row not found");

  const { data: s, error: se } = await supabase.from("sellers").insert({
    user_id: p.id,
    store_name: form.shopName,
    status: "Pending"
  }).select("id").single();
  
  if (se) throw new Error(se.message);
  
  await supabase.from("products").insert({
    seller_id: s.id,
    seller_name: form.shopName,
    name: form.firstProduct.name,
    description: form.firstProduct.description,
    price: Number(form.firstProduct.price),
    material: "cotton",
    category: "tops",
    yarn_type: "standard",
    image_url: form.firstProduct.photos?.[0] || "",
    stock_quantity: 10
  });

  revalidatePath("/seller");
  return { success: true };
}

export async function createProduct(productData: any) {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) throw new Error("Unauthorized");

  const sellerInfo = await getSellerProfile(userId);
  if (!sellerInfo) throw new Error("Seller profile not found");

  const supabase = getSupabaseAdminClient();

  const { error } = await supabase.from("products").insert({
    ...productData,
    seller_id: sellerInfo.sellerId,
    seller_name: sellerInfo.storeName,
  });

  if (error) throw new Error(error.message);

  revalidatePath("/seller");
  revalidatePath("/");
  return { success: true };
}


export async function updateShippingStatus(orderItemId: string, status: string) {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-seller-id";
  }

  if (!userId) throw new Error("Unauthorized");

  const sellerInfo = await getSellerProfile(userId);
  if (!sellerInfo) throw new Error("Seller profile not found");

  const supabase = getSupabaseAdminClient();
  
  const { error, data } = await supabase
    .from("order_items")
    .update({ shipping_status: status })
    .eq("id", orderItemId)
    .eq("seller_id", sellerInfo.sellerId)
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  if (!data) throw new Error("Order item not found or unauthorized");

  revalidatePath("/seller");
  return { success: true };
}

