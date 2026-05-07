interface EnvConfig {
  apiKey: string;
  port: number;
  supabaseAnonKey: string;
  supabaseUrl: string;
}

export function loadEnv(): EnvConfig {
  return {
    apiKey: process.env.API_KEY ?? "",
    port: Number(process.env.PORT ?? 3000),
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY ?? "",
    supabaseUrl: process.env.SUPABASE_URL ?? ""
  };
}

