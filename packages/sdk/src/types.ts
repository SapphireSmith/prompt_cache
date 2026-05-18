export interface ClientOptions {
  apiKey: string;
  baseUrl: string;
}

export interface SetOptions {
  ttlDays?: number;
}

export interface SetResult {
  success: boolean;
  expiresAt: string;
}

export interface DeleteResult {
  success: boolean;
  deleted: boolean;
}

export interface PromptCacheClient {
  get(prompt: string): Promise<string | null>;
  set(prompt: string, response: string, options?: SetOptions): Promise<SetResult>;
  delete(prompt: string): Promise<DeleteResult>;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
  };
}

export interface CacheGetResponse {
  success: true;
  hit: boolean;
  response: string | null;
}

export interface CacheSetResponse {
  success: true;
  data: {
    expires_at: string;
  };
}

export interface CacheDeleteResponse {
  success: true;
  data: {
    deleted: boolean;
  };
}
