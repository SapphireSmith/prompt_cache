# promptcache-sdk

TypeScript SDK for the `promptcache` server.

```ts
import { createClient } from "promptcache-sdk";

const cache = createClient({
  apiKey: "your-api-key",
  baseUrl: "https://your-server-url"
});

const cached = await cache.get("What is 2+2?");
```
