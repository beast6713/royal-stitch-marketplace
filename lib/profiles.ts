import "server-only";
import { getSupabaseAdminClient, hasSupabaseAdminConfig } from "@/lib/supabase";
import type { MarketplaceProfile } from "@/lib/types";

type ProfileSeed = {
  sellerClerkId: string;
  fullName: string;
  email: string | null;
  avatarUrl: string | null;
};

type ProfileRow = {
  clerk_user_id: string;
  full_name: string;
  email: string | null;
  role: "buyer" | "seller";
  avatar_url: string | null;
};

function mapProfile(row: ProfileRow): MarketplaceProfile {
  return {
    sellerClerkId: row.clerk_user_id,
    fullName: row.full_name,
    email: row.email,
    role: row.role as any,
    avatarUrl: row.avatar_url
  };
}

export async function getMarketplaceProfile(clerkUserId: string): Promise<MarketplaceProfile | null> {
  if (!hasSupabaseAdminConfig()) {
    return null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("clerk_user_id, full_name, email, role, avatar_url")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) return null;

  return mapProfile(data as ProfileRow);
}

export async function getSellerProfile(clerkUserId: string) {
  if (!hasSupabaseAdminConfig()) return null;
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, role, sellers(id, store_name, rating, total_sales)")
    .eq("clerk_user_id", clerkUserId)
    .maybeSingle();
    
  if (error || !data || !data.sellers || !data.sellers[0]) return null;
  return {
    profileId: data.id,
    role: data.role,
    sellerId: data.sellers[0].id,
    storeName: data.sellers[0].store_name,
    rating: data.sellers[0].rating,
    totalSales: data.sellers[0].total_sales
  };
}

export async function ensureMarketplaceProfile(seed: ProfileSeed) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to authorize marketplace users.");
  }

  const supabase = getSupabaseAdminClient();
  const { data: existingProfile, error: existingProfileError } = await supabase
    .from("profiles")
    .select("clerk_user_id, full_name, email, role, avatar_url")
    .eq("clerk_user_id", seed.sellerClerkId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error(existingProfileError.message);
  }

  if (!existingProfile) {
    const { data: createdProfile, error: createProfileError } = await supabase
      .from("profiles")
      .insert({
        clerk_user_id: seed.sellerClerkId,
        full_name: seed.fullName,
        email: seed.email,
        role: "buyer",
        avatar_url: seed.avatarUrl
      })
      .select("clerk_user_id, full_name, email, role, avatar_url")
      .single();

    if (createProfileError || !createdProfile) {
      throw new Error(createProfileError?.message ?? "Unable to create marketplace profile.");
    }

    return mapProfile(createdProfile as ProfileRow);
  }

  const updates: Record<string, string | null> = {};

  if (existingProfile.full_name !== seed.fullName) {
    updates.full_name = seed.fullName;
  }

  if (existingProfile.email !== seed.email) {
    updates.email = seed.email;
  }

  if (existingProfile.avatar_url !== seed.avatarUrl) {
    updates.avatar_url = seed.avatarUrl;
  }

  if (Object.keys(updates).length === 0) {
    return mapProfile(existingProfile as ProfileRow);
  }

  const { data: updatedProfile, error: updateProfileError } = await supabase
    .from("profiles")
    .update(updates)
    .eq("clerk_user_id", seed.sellerClerkId)
    .select("clerk_user_id, full_name, email, role, avatar_url")
    .single();

  if (updateProfileError || !updatedProfile) {
    throw new Error(updateProfileError?.message ?? "Unable to update marketplace profile.");
  }

  return mapProfile(updatedProfile as ProfileRow);
}

export async function syncMarketplaceProfileFromWebhook(seed: ProfileSeed) {
  return ensureMarketplaceProfile(seed);
}

export async function deleteMarketplaceProfile(clerkUserId: string) {
  if (!hasSupabaseAdminConfig()) {
    throw new Error("Supabase admin access is required to delete marketplace users.");
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("profiles").delete().eq("clerk_user_id", clerkUserId);

  if (error) {
    throw new Error(error.message);
  }
}
