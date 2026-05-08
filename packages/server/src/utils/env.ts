import { EnvConfig } from "../types";

export function loadEnv(): EnvConfig {
  const apiKey = requireEnv("API_KEY");
  const supabaseUrl = requireEnv("SUPABASE_URL");
  const supabaseAnonKey = requireEnv("SUPABASE_ANON_KEY");
  const port = parseNumberEnv("PORT", 3000);
  const defaultTtlDays = parseNumberEnv("DEFAULT_TTL_DAYS", 7);

  return {
    apiKey,
    defaultTtlDays,
    port,
    supabaseAnonKey,
    supabaseUrl
  };
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function parseNumberEnv(name: string, fallback: number): number {
  const rawValue = process.env[name];

  if (rawValue === undefined || rawValue.trim() === "") {
    return fallback;
  }

  const parsedValue = Number(rawValue);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`Environment variable ${name} must be a positive integer.`);
  }

  return parsedValue;
}
