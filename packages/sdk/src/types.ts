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
}

export interface PromptCacheClient {
  get(prompt: string): Promise<string | null>;
  set(prompt: string, response: string, options?: SetOptions): Promise<SetResult>;
  delete(prompt: string): Promise<DeleteResult>;
}
