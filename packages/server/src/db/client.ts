import { createClient, SupabaseClient } from "@supabase/supabase-js";
import ws from "ws";

import { loadEnv } from "../utils/env";

let supabaseClient: SupabaseClient | null = null;

export function getDbClient(): SupabaseClient {
  if (supabaseClient) {
    return supabaseClient;
  }

  const env = loadEnv();

  supabaseClient = createClient(env.supabaseUrl, env.supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false
    },
    realtime: {
      transport: ws as any
    }
  });

  return supabaseClient;
}
