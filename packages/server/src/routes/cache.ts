import { Request, Response, Router } from "express";

import { getDbClient } from "../db/client";
import {
  ApiErrorResponse,
  CacheDeleteRequest,
  CacheDeleteResponse,
  CacheGetHitResponse,
  CacheGetMissResponse,
  CacheRow,
  CacheSetRequest,
  CacheSetResponse
} from "../types";
import { loadEnv } from "../utils/env";
import { normalizeAndHashPrompt } from "../utils/hash";
import {
  validateCacheDeleteRequest,
  validateCacheGetQuery,
  validateCacheSetRequest
} from "../utils/validation";

export const cacheRouter = Router();
const CACHE_TABLE = "cache";

cacheRouter.get(
  "/",
  async (
    req: Request<unknown, unknown, unknown, { prompt?: string }>,
    res: Response<CacheGetHitResponse | CacheGetMissResponse | ApiErrorResponse>
  ) => {
    const validation = validateCacheGetQuery(req.query);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error
      });
      return;
    }

    try {
      const { promptHash } = normalizeAndHashPrompt(validation.data.prompt);
      const supabase = getDbClient();
      const { data, error } = await supabase
        .from(CACHE_TABLE)
        .select("response, hits, created_at, expires_at")
        .eq("prompt_hash", promptHash)
        .limit(1);

      if (error) {
        throw error;
      }

      const entry = data?.[0] as Pick<CacheRow, "response" | "hits" | "created_at" | "expires_at"> | undefined;

      if (!entry || isExpired(entry.expires_at)) {
        res.status(200).json({
          success: true,
          hit: false,
          response: null
        });
        return;
      }

      const nextHits = entry.hits + 1;
      const { error: updateError } = await supabase
        .from(CACHE_TABLE)
        .update({ hits: nextHits })
        .eq("prompt_hash", promptHash);

      if (updateError) {
        throw updateError;
      }

      res.status(200).json({
        success: true,
        hit: true,
        response: entry.response,
        meta: {
          hits: nextHits,
          created_at: entry.created_at,
          expires_at: entry.expires_at
        }
      });
    } catch {
      res.status(500).json(internalError());
    }
  }
);

cacheRouter.post(
  "/",
  async (
    req: Request<unknown, unknown, Partial<CacheSetRequest>>,
    res: Response<CacheSetResponse | ApiErrorResponse>
  ) => {
    const validation = validateCacheSetRequest(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error
      });
      return;
    }

    try {
      const env = loadEnv();
      const supabase = getDbClient();
      const { promptHash } = normalizeAndHashPrompt(validation.data.prompt);
      const ttlDays = validation.data.ttl_days ?? env.defaultTtlDays;
      const expiresAt = buildExpiryIso(ttlDays);

      const { data: existingRows, error: fetchError } = await supabase
        .from(CACHE_TABLE)
        .select("id")
        .eq("prompt_hash", promptHash)
        .limit(1);

      if (fetchError) {
        throw fetchError;
      }

      const existingEntry = existingRows && existingRows.length > 0;

      if (existingEntry) {
        const { error: updateError } = await supabase
          .from(CACHE_TABLE)
          .update({
            prompt_text: validation.data.prompt,
            response: validation.data.response,
            ttl_days: ttlDays,
            expires_at: expiresAt
          })
          .eq("prompt_hash", promptHash);

        if (updateError) {
          throw updateError;
        }
      } else {
        const { error: insertError } = await supabase.from(CACHE_TABLE).insert({
          prompt_hash: promptHash,
          prompt_text: validation.data.prompt,
          response: validation.data.response,
          ttl_days: ttlDays,
          expires_at: expiresAt
        });

        if (insertError) {
          throw insertError;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          prompt_hash: promptHash,
          expires_at: expiresAt,
          ttl_days: ttlDays,
          updated: existingEntry
        }
      });
    } catch {
      res.status(500).json(internalError());
    }
  }
);

cacheRouter.delete(
  "/",
  async (
    req: Request<unknown, unknown, Partial<CacheDeleteRequest>>,
    res: Response<CacheDeleteResponse | ApiErrorResponse>
  ) => {
    const validation = validateCacheDeleteRequest(req.body);

    if (!validation.success) {
      res.status(400).json({
        success: false,
        error: validation.error
      });
      return;
    }

    try {
      const { promptHash } = normalizeAndHashPrompt(validation.data.prompt);
      const supabase = getDbClient();
      const { data, error } = await supabase
        .from(CACHE_TABLE)
        .delete()
        .eq("prompt_hash", promptHash)
        .select("prompt_hash");

      if (error) {
        throw error;
      }

      res.status(200).json({
        success: true,
        data: {
          deleted: Boolean(data && data.length > 0),
          prompt_hash: promptHash
        }
      });
    } catch {
      res.status(500).json(internalError());
    }
  }
);

function buildExpiryIso(ttlDays: number): string {
  const millisecondsPerDay = 24 * 60 * 60 * 1000;

  return new Date(Date.now() + ttlDays * millisecondsPerDay).toISOString();
}

function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt).getTime() <= Date.now();
}

function internalError(): ApiErrorResponse {
  return {
    success: false,
    error: {
      code: "INTERNAL_ERROR",
      message: "Something went wrong while processing the cache request."
    }
  };
}
