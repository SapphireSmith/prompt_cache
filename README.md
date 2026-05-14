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