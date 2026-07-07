import "server-only";
import { createClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";

export function hasSupabaseReadConfig() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}

export function hasSupabaseAdminConfig() {
  return Boolean(env.NEXT_PUBLIC_SUPABASE_URL && env.SUPABASE_SERVICE_ROLE_KEY);
}

export function hasSupabaseWriteConfig() {
  return hasSupabaseAdminConfig();
}

function buildServerClient(supabaseKey: string) {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;

  if (!supabaseUrl) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

export function getSupabaseReadClient() {
  const supabaseKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseKey) {
    throw new Error("Supabase anon key is not configured.");
  }

  return buildServerClient(supabaseKey);
}

export function getSupabaseAdminClient() {
  const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseKey) {
    throw new Error("Supabase service role key is not configured.");
  }

  return buildServerClient(supabaseKey);
}
