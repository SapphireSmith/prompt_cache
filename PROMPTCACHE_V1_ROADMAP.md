# Promptcache V1 Roadmap

## Purpose

This document is the working blueprint for building `promptcache` V1.

It captures:
- the locked V1 scope
- the monorepo structure
- the phased build roadmap
- the sub-tasks for each phase
- the branch strategy to follow once coding begins

This is a planning document only. No implementation should begin until explicit permission is given.

---

## Locked V1 Decisions

- Repository strategy: monorepo
- Visibility: keep both server and SDK public for now
- Response type: text only
- Authentication: single API key stored in server environment variables
- TTL behavior: server default with optional override from SDK/client
- Validation: reject empty prompt and reject empty response
- Delete behavior: delete by prompt
- Expired entry behavior: treat expired entries as cache misses for now
- Duplicate `set()` behavior: replace the existing cached response and refresh TTL
- Hosting: not decided yet

---

## Product Summary

`promptcache` is a two-layer caching product for LLM applications:

- Layer 1: a REST API server that stores and retrieves cache entries
- Layer 2: an npm SDK that developers install in their AI agents or apps

The goal of V1 is to help developers skip repeated LLM API calls by caching prompt/response pairs on a shared server.

If a normalized prompt already exists in cache and is still valid:
- return the cached response
- do not call the LLM

If the prompt is not in cache or the entry is expired:
- treat it as a miss
- let the developer's app call the LLM normally
- allow the fresh result to be stored through `set()`

---

## Monorepo Structure

Recommended top-level structure:

```text
promptcache/
  packages/
    server/
    sdk/
  docs/
  README.md
```

Suggested package structure for the server:

```text
packages/server/
  src/
    index.ts
    routes/
    middleware/
    db/
    utils/
    types/
  package.json
  tsconfig.json
  .env.example
```

Suggested package structure for the SDK:

```text
packages/sdk/
  src/
    index.ts
    client.ts
    types.ts
  package.json
  tsconfig.json
  README.md
```

Suggested documentation structure:

```text
docs/
  v1-spec.md
  api-contract.md
  testing-checklist.md
  deployment-notes.md
```

---

## V1 Behavior Rules

### Prompt normalization

Before hashing, prompts should be normalized in this order:

1. Trim leading and trailing whitespace
2. Convert to lowercase
3. Collapse repeated internal whitespace to a single space
4. Remove trailing punctuation

Examples that should map to the same cache key:

- `What is the capital of France?`
- ` what is the capital of france `
- `What is the capital of France!!!`

Examples that should remain different:

- `What is the capital of France`
- `What is the population of France`

### Hashing

- Hash the normalized prompt using SHA256
- Use the hash as the primary lookup key
- Keep original prompt text stored for debugging and transparency

### Cache hit behavior

When `GET /cache` receives a prompt and a valid, non-expired entry exists:

- return `hit: true`
- return the cached response
- increment the hit counter

### Cache miss behavior

When no entry exists:

- return `hit: false`
- return `response: null`

When an entry exists but is expired:

- return `hit: false`
- return `response: null`
- do not use the expired response
- do not delete it yet in V1

### Duplicate save behavior

If `set()` or `POST /cache` is called for a prompt that already exists:

- replace the stored response
- refresh the TTL
- recalculate `expires_at`

### Validation rules

- empty prompt: reject
- empty response: reject
- invalid or missing API key: reject
- invalid TTL input: reject

---

## Phase Checklist

## Phase 1: Project Blueprint and Repository Setup

### Goal

Set up the planning foundation so implementation can happen cleanly and in order.

### Sub-tasks

- Confirm root folder naming and package naming
- Confirm monorepo structure
- Define top-level documentation layout
- Define branch naming conventions
- Create a short V1 contract document
- Create a glossary for core product terms

### Done criteria

- The project layout is documented
- Branch naming is agreed
- V1 rules are written clearly enough to implement without guesswork

---

## Phase 2: API and Behavior Specification

### Goal

Lock the server contract before coding routes.

### Sub-tasks

- Finalize endpoint list
- Define request format for each endpoint
- Define success response for each endpoint
- Define error response format
- Define auth failure behavior
- Define duplicate `set()` update behavior
- Define hit counter increment behavior
- Define expired-entry behavior

### Endpoints in scope

- `GET /cache`
- `POST /cache`
- `DELETE /cache`
- `GET /health`

### Done criteria

- Every endpoint has a clear request and response contract
- Validation and error behavior are documented

---

## Phase 3: Data Model and Supabase Design

### Goal

Prepare the storage layer and schema decisions needed by the server.

### Sub-tasks

- Finalize the `cache` table schema
- Confirm `prompt_hash` uniqueness
- Define any indexes needed for lookup speed
- Confirm how `hits` behaves on insert and update
- Confirm how `created_at` behaves during replacement
- Confirm how `expires_at` is calculated
- Decide whether to keep original prompt text and full response text
- Write future notes for expired-row cleanup

### Done criteria

- The schema is ready to create in Supabase
- All important field behaviors are defined

---

## Phase 4: Prompt Normalization and Hashing Design

### Goal

Make matching behavior predictable and consistent.

### Sub-tasks

- Lock the exact normalization sequence
- Write matching examples
- Write non-matching examples
- Define where hashing occurs
- Define how delete-by-prompt is translated into hash lookup
- Capture edge cases around whitespace and punctuation

### Done criteria

- Developers can tell whether two prompts should map to the same key
- Server-side hashing behavior is unambiguous

---

## Phase 5: Server Architecture Planning

### Goal

Define the internal design of the server package.

### Sub-tasks

- Define folder structure inside `packages/server`
- Plan config loading and environment handling
- Plan auth middleware boundaries
- Plan route file organization
- Plan database client layer
- Plan shared utilities
- Plan centralized error handling

### Done criteria

- Server responsibilities are separated clearly
- Package structure is ready to scaffold

---

## Phase 6: SDK Architecture Planning

### Goal

Define the public interface and internal design of the SDK package.

### Sub-tasks

- Define folder structure inside `packages/sdk`
- Finalize `createClient`
- Finalize `get`, `set`, and `delete` method signatures
- Define TypeScript interfaces
- Decide how Axios errors should surface
- Prepare usage examples for documentation

### Done criteria

- SDK interface is stable enough to implement
- Type definitions are clear

---

## Phase 7: Testing Strategy

### Goal

Define how the server and SDK will be verified once built.

### Sub-tasks

- Write manual API test cases
- Write normalization test cases
- Write TTL behavior test cases
- Write auth test cases
- Write duplicate update test cases
- Write delete-by-prompt test cases
- Write SDK integration test scenarios

### Example validation flow

1. `get(prompt)` returns miss
2. `set(prompt, response)` stores entry
3. `get(prompt)` returns hit
4. `get(prompt)` again increments hit count
5. `delete(prompt)` removes entry
6. `get(prompt)` returns miss again

### Done criteria

- There is a clear checklist for manual and integration verification

---

## Phase 8: Release and Deployment Planning

### Goal

Prepare for deployment and npm publication without locking into a hosting provider too early.

### Sub-tasks

- Define required environment variables
- Define `.env.example` contents
- Prepare local setup instructions
- Prepare deployment checklist
- Prepare SDK publish checklist
- Define versioning approach
- Define release smoke-test flow

### Done criteria

- Deployment and release steps are documented
- Changing hosting provider later will not affect core product behavior

---

## Branch Strategy

When coding begins, do not work directly on `main`.

Create a new branch for each phase or feature.

Suggested branch names:

- `phase-1-repo-blueprint`
- `phase-2-api-spec`
- `phase-3-db-design`
- `phase-4-server-foundation`
- `phase-5-server-cache-routes`
- `phase-6-sdk-foundation`
- `phase-7-sdk-methods`
- `phase-8-testing`
- `phase-9-release-prep`

Suggested names for smaller future work:

- `feature/ttl-cleanup-job`
- `feature/multi-api-keys`
- `feature/cache-observability`
- `fix/sdk-delete-error-handling`

Branching rule:

- no coding on `main`
- one branch per focused unit of work
- merge only after the phase or feature is complete and reviewed

---

## Public vs Private Best Practices

Since the repo is public for now:

- never commit real `.env` files
- commit only `.env.example`
- never hardcode API keys or Supabase secrets
- keep setup instructions safe for public readers
- assume SDK source may be read by npm users and contributors

If visibility changes later, possible options include:

- keep the monorepo private and still publish the SDK to npm
- split the server and SDK into separate repositories
- keep the SDK public while the server becomes private

This does not need to be decided during V1 planning.

---

## Open for Later

These items are intentionally deferred:

- hosting provider choice
- automated cleanup for expired rows
- multi-key authentication
- semantic caching
- analytics or dashboard features
- automated test framework choice
- package versioning strategy details

---

## Current Status

Planning status: Phase 1 completed at the blueprint level.

Next planning move, if needed:

- convert this roadmap into more detailed per-phase execution checklists
- or begin coding only after explicit permission is given and a new branch is created
