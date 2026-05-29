import express, { Express, NextFunction, Request, Response } from "express";

import { getDbClient } from "./db/client";
import { requireApiKey } from "./middleware/auth";
import { CacheDbClient, createCacheRouter } from "./routes/cache";
import { healthRouter } from "./routes/health";
import { EnvConfig } from "./types";

export interface AppDependencies {
  defaultTtlDays?: number;
  getDbClient?: () => CacheDbClient;
}

export function createApp(env: EnvConfig, dependencies: AppDependencies = {}): Express {
  const app = express();
  const cacheAuthMiddleware = requireApiKey(env.apiKey);

  app.use(express.json());
  app.use(requestLogger);

  app.use("/health", healthRouter);
  app.use(
    "/cache",
    cacheAuthMiddleware,
    createCacheRouter({
      defaultTtlDays: dependencies.defaultTtlDays ?? env.defaultTtlDays,
      getDbClient: dependencies.getDbClient ?? getDbClient
    })
  );

  return app;
}

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  console.log(`[request] ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(`[response] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
}
