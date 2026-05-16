# promptcache

Shared prompt-response caching infrastructure for LLM applications.

`promptcache` helps AI applications reduce token costs, improve response times, and avoid repeated LLM inference by reusing previously generated responses through a centralized cache layer.

Built for developers building AI products, chat systems, agents, RAG pipelines, and multi-application LLM infrastructure.

### Current Features

- Prompt normalization
- SHA256-based cache keys
- TTL expiration support
- Cache hit tracking
- REST API
- Typed TypeScript backend
- Supabase integration
- Monorepo architecture

### Planned Features

- SDK package
- Semantic similarity caching
- Redis backend
- Embedding-based retrieval
- Streaming support
- Multi-provider support

---

```txt
Application
    ↓
promptcache API
    ↓
Normalize + Hash Prompt
    ↓
Cache Storage
    ↓
Cached Response


## Architecture Preview

`promptcache` acts as a shared caching layer between your application and the LLM provider.

Instead of generating the same response repeatedly, prompts are normalized, hashed, and checked against the cache before new inference is performed.

```txt
User Request
     ↓
Application / AI Agent
     ↓
promptcache API
     ↓
Normalize Prompt
     ↓
Generate SHA256 Hash
     ↓
Check Cache Store
     ↓
 ┌───────────────┐
 │ Cache Hit     │ → Return Cached Response
 └───────────────┘
           │
           ▼
 ┌───────────────┐
 │ Cache Miss    │ → Generate New LLM Response
 └───────────────┘
           ↓
Store Response + Metadata
           ↓
Return Response

## Why This Exists

Modern AI applications repeatedly generate the same responses for identical or structurally similar prompts.

This creates unnecessary:

- Token usage
- Inference costs
- API latency
- Compute overhead
- Response delays

As LLM-powered systems scale, repeated inference becomes increasingly expensive and inefficient.

`promptcache` was built to reduce redundant LLM work by introducing a reusable caching layer between applications and model providers.

Instead of generating responses repeatedly:

1. Prompts are normalized
2. A deterministic hash is generated
3. Existing cached responses are reused when available

This allows AI systems to:

- Reduce operational costs
- Improve response speed
- Share cached responses across applications
- Minimize duplicate inference
- Build more scalable LLM infrastructure

The long-term goal of `promptcache` is to evolve beyond deterministic caching into a semantic caching platform capable of retrieving responses based on meaning and similarity rather than exact prompt matches.