export interface EnvConfig {
  apiKey: string;
  defaultTtlDays: number;
  port: number;
  supabaseAnonKey: string;
  supabaseUrl: string;
}

export type ApiErrorCode =
  | "INTERNAL_ERROR"
  | "NOT_FOUND"
  | "NOT_IMPLEMENTED"
  | "UNAUTHORIZED"
  | "VALIDATION_ERROR";

export interface ApiErrorResponse {
  success: false;
  error: {
    code: ApiErrorCode;
    message: string;
  };
}

export interface HealthResponse {
  success: true;
  status: "ok";
}

export interface CacheEntry {
  promptHash: string;
  promptText: string;
  response: string;
  hits: number;
  ttlDays: number;
  createdAt: string;
  expiresAt: string;
}

export interface CacheRow {
  id: number;
  prompt_hash: string;
  prompt_text: string;
  response: string;
  hits: number;
  ttl_days: number;
  created_at: string;
  expires_at: string;
}

export interface CacheGetQuery {
  prompt: string;
}

export interface CacheGetHitResponse {
  success: true;
  hit: true;
  response: string;
  meta: {
    hits: number;
    created_at: string;
    expires_at: string;
  };
}

export interface CacheGetMissResponse {
  success: true;
  hit: false;
  response: null;
}

export interface CacheSetRequest {
  prompt: string;
  response: string;
  ttl_days?: number;
}

export interface CacheSetResponse {
  success: true;
  data: {
    prompt_hash: string;
    expires_at: string;
    ttl_days: number;
    updated: boolean;
  };
}

export interface CacheDeleteRequest {
  prompt: string;
}

export interface CacheDeleteResponse {
  success: true;
  data: {
    deleted: boolean;
    prompt_hash: string;
  };
}
