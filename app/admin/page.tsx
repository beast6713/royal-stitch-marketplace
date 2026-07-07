import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { isClerkConfigured } from "@/lib/env";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getMarketplaceProfile } from "@/lib/profiles";
import { AdminDashboardClient } from "./admin-client";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let userId: string | null = null;
  if (isClerkConfigured()) {
    const authResult = await auth();
    userId = authResult.userId;
  } else {
    userId = "mock-admin-id";
  }

  if (!userId) redirect("/sign-in");

  const profile = await getMarketplaceProfile(userId);
  if (!profile || profile.role !== "admin") redirect("/");

  const supabase = getSupabaseAdminClient();

  // Fetch all sellers with their associated profiles
  const { data: sellersData } = await supabase
    .from("sellers")
    .select("*, profiles(clerk_user_id, full_name, email)");

  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <AdminDashboardClient 
      sellers={sellersData ?? []} 
      products={productsData ?? []} 
    />
  );
}
