import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";

import { requireApiKey } from "./middleware/auth";
import { cacheRouter } from "./routes/cache";
import { healthRouter } from "./routes/health";
import { loadEnv } from "./utils/env";

dotenv.config();

const env = loadEnv();
const app = express();
const cacheAuthMiddleware = requireApiKey(env.apiKey);

app.use(express.json());
app.use(requestLogger);

app.use("/health", healthRouter);
app.use("/cache", cacheAuthMiddleware, cacheRouter);

app.listen(env.port, () => {
  console.log(`[promptcache] server listening on port ${env.port}`);
  console.log(`[promptcache] health endpoint: http://localhost:${env.port}/health`);
  console.log(`[promptcache] cache endpoint: http://localhost:${env.port}/cache`);
});

function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const startedAt = Date.now();
  console.log(`[request] ${req.method} ${req.originalUrl}`);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    console.log(`[response] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${durationMs}ms)`);
  });

  next();
}
