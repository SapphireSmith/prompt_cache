import { ClientOptions, DeleteResult, PromptCacheClient, SetOptions, SetResult } from "./types";

export function createClient(options: ClientOptions): PromptCacheClient {
  validateClientOptions(options);

  return {
    async get(_prompt: string): Promise<string | null> {
      throw new Error("cache.get() is not implemented yet.");
    },

    async set(_prompt: string, _response: string, _options?: SetOptions): Promise<SetResult> {
      throw new Error("cache.set() is not implemented yet.");
    },

    async delete(_prompt: string): Promise<DeleteResult> {
      throw new Error("cache.delete() is not implemented yet.");
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
