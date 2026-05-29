import dotenv from "dotenv";

import { createApp } from "./app";
import { loadEnv } from "./utils/env";

dotenv.config();

const env = loadEnv();
const app = createApp(env);

app.listen(env.port, () => {
  console.log(`[promptcache] server listening on port ${env.port}`);
  console.log(`[promptcache] health endpoint: http://localhost:${env.port}/health`);
  console.log(`[promptcache] cache endpoint: http://localhost:${env.port}/cache`);
});
