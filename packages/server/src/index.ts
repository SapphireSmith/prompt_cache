import dotenv from "dotenv";
import express from "express";

import { requireApiKey } from "./middleware/auth";
import { cacheRouter } from "./routes/cache";
import { healthRouter } from "./routes/health";
import { loadEnv } from "./utils/env";

dotenv.config();

const env = loadEnv();
const app = express();
const cacheAuthMiddleware = requireApiKey(env.apiKey);

app.use(express.json());

app.use("/health", healthRouter);
app.use("/cache", cacheAuthMiddleware, cacheRouter);

app.listen(env.port, () => {
  console.log(`promptcache server listening on port ${env.port}`);
});
