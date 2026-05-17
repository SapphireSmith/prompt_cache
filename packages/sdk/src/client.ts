import axios, { AxiosError } from "axios";

import {
  ApiErrorResponse,
  CacheDeleteResponse,
  CacheGetResponse,
  CacheSetResponse,
  ClientOptions,
  DeleteResult,
  PromptCacheClient,
  SetOptions,
  SetResult
} from "./types";

export function createClient(options: ClientOptions): PromptCacheClient {
  validateClientOptions(options);
  const http = axios.create({
    baseURL: normalizeBaseUrl(options.baseUrl),
    headers: {
      "x-api-key": options.apiKey
    }
  });

  return {
    async get(prompt: string): Promise<string | null> {
      validatePrompt(prompt);

      try {
        const result = await http.get<CacheGetResponse>("/cache", {
          params: { prompt }
        });

        return result.data.hit ? result.data.response : null;
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async set(prompt: string, response: string, options?: SetOptions): Promise<SetResult> {
      validatePrompt(prompt);
      validateResponse(response);
      validateSetOptions(options);

      try {
        const result = await http.post<CacheSetResponse>("/cache", {
          prompt,
          response,
          ttl_days: options?.ttlDays
        });

        return {
          success: result.data.success,
          expiresAt: result.data.data.expires_at
        };
      } catch (error) {
        throw normalizeError(error);
      }
    },

    async delete(prompt: string): Promise<DeleteResult> {
      validatePrompt(prompt);

      try {
        const result = await http.delete<CacheDeleteResponse>("/cache", {
          data: { prompt }
        });

        return {
          success: result.data.success,
          deleted: result.data.data.deleted
        };
      } catch (error) {
        throw normalizeError(error);
      }
    }
  };
}

function validateClientOptions(options: ClientOptions): void {
  if (!options.apiKey?.trim()) {
    throw new Error("Client option 'apiKey' is required.");
  }

  if (!options.baseUrl?.trim()) {
    throw new Error("Client option 'baseUrl' is required.");
  }
}

function validatePrompt(prompt: string): void {
  if (!prompt?.trim()) {
    throw new Error("Prompt must be a non-empty string.");
  }
}

function validateResponse(response: string): void {
  if (!response?.trim()) {
    throw new Error("Response must be a non-empty string.");
  }
}

function validateSetOptions(options?: SetOptions): void {
  if (options?.ttlDays === undefined) {
    return;
  }

  if (!Number.isInteger(options.ttlDays) || options.ttlDays <= 0) {
    throw new Error("Set option 'ttlDays' must be a positive integer.");
  }
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.trim().replace(/\/+$/g, "");
}

function normalizeError(error: unknown): Error {
  if (axios.isAxiosError(error)) {
    return normalizeAxiosError(error);
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("An unknown promptcache SDK error occurred.");
}

function normalizeAxiosError(error: AxiosError<ApiErrorResponse>): Error {
  const apiMessage = error.response?.data?.error?.message;

  if (apiMessage) {
    return new Error(apiMessage);
  }

  if (error.message) {
    return new Error(error.message);
  }

  return new Error("Promptcache request failed.");
}
