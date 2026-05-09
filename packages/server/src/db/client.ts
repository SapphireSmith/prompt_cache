import { createClient, SupabaseClient } from "@supabase/supabase-js";

import { loadEnv } from "../utils/env";

let supabaseClient: SupabaseClient | null = null;

export function getDbClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const env = loadEnv();

  supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey);

  return supabaseClient;
}
