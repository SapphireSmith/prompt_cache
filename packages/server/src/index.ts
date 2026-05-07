import dotenv from "dotenv";
import express from "express";

import { healthRouter } from "./routes/health";
import { loadEnv } from "./utils/env";

dotenv.config();

const env = loadEnv();
const app = express();

app.use(express.json());

app.use("/health", healthRouter);

app.listen(env.port, () => {
  console.log(`promptcache server listening on port ${env.port}`);
});

