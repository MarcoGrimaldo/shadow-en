import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "../types";

export type SupabaseClientType = SupabaseClient<Database>;

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  serviceKey?: string;
}

/**
 * Create a Supabase client for client-side usage
 */
export function createSupabaseClient(
  config: SupabaseConfig,
): SupabaseClientType {
  return createClient<Database>(config.url, config.anonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  });
}

/**
 * Create a Supabase admin client for server-side usage
 */
export function createSupabaseAdmin(
  config: SupabaseConfig,
): SupabaseClientType {
  const key = config.serviceKey || config.anonKey;
  return createClient<Database>(config.url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// Re-export types from Supabase for convenience
export { User as SupabaseUser, Session } from "@supabase/supabase-js";
