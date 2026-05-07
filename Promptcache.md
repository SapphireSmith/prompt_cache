# promptcache — Library Development Overview

## What Is This?

`promptcache` is a Layer 1 + Layer 2 product that caches LLM prompt/response pairs on a server so AI agents can skip redundant LLM API calls. When the same prompt is sent again, the cached response is returned instantly — no LLM call, no cost, no latency.

It has two parts:
- **Layer 1** — A REST API server that stores and retrieves cached prompts from a Supabase database
- **Layer 2** — An npm SDK developers install and use inside their AI agents

---

## The Problem It Solves

AI agents often send the same or repeated prompts to LLMs — especially in loops, retries, or multi-agent setups. Every call costs money and adds latency. There is no simple drop-in solution to cache these calls across sessions and machines. Local caching (in-memory or file-based) doesn't work when you have multiple agent instances running.

`promptcache` solves this with a shared server-side cache any agent can read from and write to.

---

## Who Is It For?

- Developers building AI agents
- Anyone calling OpenAI, Anthropic, Ollama, or any LLM API repeatedly
- Developers who want to reduce API costs and latency without changing their agent logic significantly

---

## Core Features (V1 Scope Only)

1. **Cache set** — store a prompt + response pair on the server
2. **Cache get** — retrieve a cached response by prompt
3. **Hit counter** — track how many times a cached response was served
4. **TTL (Time To Live)** — automatically expire cache entries after a configurable number of days

---

## Full Flow

```
1. Developer installs the npm SDK
2. Agent prepares a prompt
3. SDK calls GET /cache on the server with the prompt
4. Server hashes the prompt → checks Supabase database
5. HIT  → returns cached response → agent uses it, LLM never called
6. MISS → returns null → agent calls LLM normally → gets response
7. Agent calls SDK set() → POST /cache → server stores prompt + response in Supabase
8. Next time same prompt arrives → HIT
```

---

## Architecture

```
Your AI Agent
     ↓
promptcache SDK (Layer 2 — npm package)
     ↓
promptcache Server (Layer 1 — REST API)
     ↓
Supabase (PostgreSQL database)
```

---

## Tech Stack

### Layer 1 — Server
- **Runtime:** Node.js
- **Framework:** Express
- **Language:** TypeScript
- **Database:** Supabase (PostgreSQL) via `@supabase/supabase-js` client
- **Hashing:** crypto module (built into Node.js — no install needed) — SHA256
- **Environment variables:** dotenv
- **Hosting:** Railway or Render (free tier)

### Layer 2 — SDK
- **Language:** TypeScript
- **HTTP client:** Axios
- **Published to:** npm

---

## Layer 1 — The Server

### How Hashing Works
Prompts are hashed before storing so long strings become short fixed-length keys:
```
"What is the capital of France?" → SHA256 → "e3b0c44298fc1c149afb..."
```
This is used as the unique key in the database.

### Prompt Normalization (Basic Fuzzy Matching)
Before hashing, normalize the prompt:
- Lowercase everything
- Trim whitespace
- Remove punctuation at the end

This ensures "What is 2+2?" and "what is 2+2" return the same cache hit.

### Supabase Setup
Create a new Supabase project and run the following SQL to create the cache table:

```sql
CREATE TABLE cache (
  id SERIAL PRIMARY KEY,
  prompt_hash VARCHAR UNIQUE NOT NULL,
  prompt_text TEXT NOT NULL,
  response TEXT NOT NULL,
  hits INTEGER DEFAULT 0,
  ttl_days INTEGER DEFAULT 7,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP NOT NULL
);
```

### Supabase JS Usage Example
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY)

// Get cached response
const { data, error } = await supabase
  .from('cache')
  .select('*')
  .eq('prompt_hash', hash)
  .single()

// Insert new cache entry
const { data, error } = await supabase
  .from('cache')
  .insert({ prompt_hash, prompt_text, response, ttl_days, expires_at })

// Increment hit counter
const { data, error } = await supabase
  .from('cache')
  .update({ hits: existingHits + 1 })
  .eq('prompt_hash', hash)
```

---

### API Endpoints

#### GET /cache
Check if a cached response exists for a prompt.

**Query params:**
- `prompt` (string) — the raw prompt text

**Response (HIT):**
```json
{
  "hit": true,
  "response": "The cached LLM response here",
  "hits": 5,
  "created_at": "2024-01-01T00:00:00Z"
}
```

**Response (MISS):**
```json
{
  "hit": false,
  "response": null
}
```

---

#### POST /cache
Store a new prompt + response pair.

**Request body:**
```json
{
  "prompt": "What is the capital of France?",
  "response": "The capital of France is Paris.",
  "ttl_days": 7
}
```

**Response:**
```json
{
  "success": true,
  "prompt_hash": "e3b0c44298fc1c149afb...",
  "expires_at": "2024-01-08T00:00:00Z"
}
```

---

#### DELETE /cache/:prompt_hash
Delete a specific cache entry manually.

**Response:**
```json
{
  "success": true,
  "deleted": "e3b0c44298fc1c149afb..."
}
```

---

#### GET /health
Basic health check endpoint to confirm server is running.

**Response:**
```json
{
  "status": "ok"
}
```

---

### Authentication
Every request must include an API key in the header:
```
x-api-key: your-api-key
```
Server validates this against the API key stored in `.env` before processing any request. If invalid, return 401.

For V1, a single API key in `.env` is sufficient. No user management system needed yet.

---

### Folder Structure (Server)

```
promptcache-server/
├── src/
│   ├── index.ts          # entry point, starts Express server
│   ├── routes/
│   │   └── cache.ts      # GET, POST, DELETE /cache routes
│   ├── middleware/
│   │   └── auth.ts       # API key validation middleware
│   ├── db/
│   │   └── client.ts     # Supabase client initialization
│   └── utils/
│       └── hash.ts       # prompt normalization + SHA256 hashing
├── .env                  # SUPABASE_URL, SUPABASE_ANON_KEY, API_KEY, PORT
├── package.json
└── tsconfig.json
```

---

### Dependencies (Server)

```json
{
  "dependencies": {
    "express": "^4.18.2",
    "@supabase/supabase-js": "^2.39.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/express": "^4.17.21",
    "@types/node": "^20.0.0",
    "ts-node": "^10.9.2"
  }
}
```

---

## Layer 2 — The SDK (npm package)

### Package Name
```
promptcache-sdk
```

Install:
```bash
npm install promptcache-sdk
```

---

### Initialization

```javascript
import { createClient } from 'promptcache-sdk'

const cache = createClient({
  apiKey: "your-api-key",
  baseUrl: "https://your-server.railway.app"
})
```

---

### SDK API

#### `cache.get(prompt)`
Check if a cached response exists.

**Parameters:**
- `prompt` (string) — the prompt to look up

**Returns:** `string | null` — the cached response or null if not found

**Example:**
```javascript
const cached = await cache.get("What is the capital of France?")

if (cached) {
  console.log("Cache hit:", cached)
} else {
  console.log("Cache miss — calling LLM")
}
```

---

#### `cache.set(prompt, response, options?)`
Store a prompt + response pair.

**Parameters:**
- `prompt` (string) — the prompt
- `response` (string) — the LLM response to cache
- `options` (optional object):
  - `ttlDays` (number) — how many days before this entry expires. Default: `7`

**Returns:** `{ success: boolean, expiresAt: string }`

**Example:**
```javascript
await cache.set("What is the capital of France?", "The capital of France is Paris.", {
  ttlDays: 14
})
```

---

#### `cache.delete(prompt)`
Manually delete a cache entry by prompt.

**Parameters:**
- `prompt` (string) — the prompt to delete

**Returns:** `{ success: boolean }`

**Example:**
```javascript
await cache.delete("What is the capital of France?")
```

---

### Real World Usage Pattern

This is how a developer would use promptcache inside an AI agent:

```javascript
import { createClient } from 'promptcache-sdk'
import OpenAI from 'openai'

const cache = createClient({ apiKey: "your-key", baseUrl: "https://your-server.com" })
const openai = new OpenAI({ apiKey: "openai-key" })

async function askLLM(prompt) {
  // 1. Check cache first
  const cached = await cache.get(prompt)
  if (cached) return cached // skip LLM entirely

  // 2. Cache miss — call LLM
  const result = await openai.chat.completions.create({
    model: "gpt-4",
    messages: [{ role: "user", content: prompt }]
  })

  const response = result.choices[0].message.content

  // 3. Store in cache for next time
  await cache.set(prompt, response, { ttlDays: 7 })

  return response
}
```

---

### SDK Folder Structure

```
promptcache-sdk/
├── src/
│   ├── index.ts        # exports createClient
│   └── client.ts       # get, set, delete methods using Axios
├── dist/               # compiled output
├── package.json
├── tsconfig.json
└── README.md
```

### Dependencies (SDK)

```json
{
  "dependencies": {
    "axios": "^1.6.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^20.0.0"
  }
}
```

---

### TypeScript Types

```typescript
export interface ClientOptions {
  apiKey: string
  baseUrl: string
}

export interface SetOptions {
  ttlDays?: number
}

export interface SetResult {
  success: boolean
  expiresAt: string
}

export interface DeleteResult {
  success: boolean
}
```

---

## Build Order

Build in this exact order:

1. Create a new Supabase project and run the SQL to create the cache table
2. Build the server (Layer 1) — start with POST /cache, then GET /cache, then DELETE
3. Test all server endpoints manually with Postman or Thunder Client
4. Deploy server to Railway or Render
5. Build the SDK (Layer 2) — get, set, delete methods using Axios
6. Test SDK locally against the deployed server
7. Publish SDK to npm

---

## Environment Variables (Server)

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
API_KEY=your_secret_api_key
PORT=3000
```

---

## What This Is NOT

- It is not a semantic cache (does not use embeddings or vector similarity — V1 is exact match only after normalization)
- It is not a full observability platform (no dashboard in V1)
- It does not call any LLM itself — it only stores and retrieves what the developer's agent provides

---

## Summary

`promptcache` is a server-backed caching layer for LLM prompts. Developers install the SDK, wrap their existing LLM calls with two lines of code, and immediately start saving on API costs and latency. The server handles storage, hashing, TTL expiry, and hit tracking via Supabase. The SDK uses Axios to communicate with the server. V1 scope is deliberately minimal — cache get, cache set, cache delete, hit counter, and TTL.