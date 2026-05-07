export interface CacheEntry {
  promptHash: string;
  promptText: string;
  response: string;
  hits: number;
  ttlDays: number;
  createdAt: string;
  expiresAt: string;
}
