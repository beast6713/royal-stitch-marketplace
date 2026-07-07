"use server";

import { auth } from "@clerk/nextjs/server";
import { getSupabaseAdminClient } from "@/lib/supabase";
import { getMarketplaceProfile } from "@/lib/profiles";
import { revalidatePath } from "next/cache";

export async function deleteSeller(sellerId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await getMarketplaceProfile(userId);
  if (!profile || profile.role !== "admin") throw new Error("Unauthorized");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("sellers").delete().eq("id", sellerId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return { success: true };
}

export async function deleteOrder(orderId: string) {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const profile = await getMarketplaceProfile(userId);
  if (!profile || profile.role !== "admin") throw new Error("Unauthorized");

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("orders").delete().eq("id", orderId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin");
  return { success: true };
}
