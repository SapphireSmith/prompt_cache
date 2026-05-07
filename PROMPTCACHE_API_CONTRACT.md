# Promptcache V1 API Contract

## Purpose

This document defines the V1 HTTP contract for the `promptcache` server.

It is intended to remove ambiguity before implementation starts.

---

## Base Rules

- All protected endpoints require the header `x-api-key`
- The server validates `x-api-key` against the value stored in environment variables
- All request and response bodies use JSON unless noted otherwise
- Prompt hashing happens on the server, not in the SDK
- Prompt normalization happens on the server before hashing
- Expired entries are treated as cache misses in V1
- Empty prompts and empty responses must be rejected

---

## Authentication

### Required header

```http
x-api-key: your-api-key
```

### Invalid or missing key response

Status: `401 Unauthorized`

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or missing API key."
  }
}
```

---

## Error Response Format

All non-success responses should follow this shape:

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message."
  }
}
```

Suggested V1 error codes:

- `UNAUTHORIZED`
- `VALIDATION_ERROR`
- `NOT_FOUND`
- `INTERNAL_ERROR`

---

## `GET /health`

### Purpose

Confirm the server is running.

### Auth

No auth required.

### Request

No request body.

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "status": "ok"
}
```

---

## `GET /cache`

### Purpose

Check whether a cached response exists for a prompt.

### Auth

Required.

### Query parameters

- `prompt` required, string

Example:

```http
GET /cache?prompt=What%20is%20the%20capital%20of%20France%3F
```

### Server behavior

1. Validate `prompt`
2. Normalize prompt
3. Hash normalized prompt with SHA256
4. Look up the row by `prompt_hash`
5. If row does not exist, return miss
6. If row exists but is expired, return miss
7. If row exists and is valid, return hit and increment `hits`

### Success response: hit

Status: `200 OK`

```json
{
  "success": true,
  "hit": true,
  "response": "Paris",
  "meta": {
    "hits": 5,
    "created_at": "2026-05-07T12:00:00.000Z",
    "expires_at": "2026-05-14T12:00:00.000Z"
  }
}
```

### Success response: miss

Status: `200 OK`

```json
{
  "success": true,
  "hit": false,
  "response": null
}
```

### Validation error response

Status: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Query parameter 'prompt' is required and must be a non-empty string."
  }
}
```

---

## `POST /cache`

### Purpose

Store a new prompt/response pair, or replace an existing one and refresh TTL.

### Auth

Required.

### Request body

```json
{
  "prompt": "What is the capital of France?",
  "response": "Paris",
  "ttl_days": 7
}
```

### Field rules

- `prompt` required, non-empty string
- `response` required, non-empty string
- `ttl_days` optional
- if `ttl_days` is omitted, the server default is used
- `ttl_days` must be a positive integer if provided

### Server behavior

1. Validate input
2. Normalize prompt
3. Hash normalized prompt with SHA256
4. Compute `expires_at` using `ttl_days`
5. If no row exists, insert a new row
6. If a row already exists for the same hash, replace the response and refresh TTL

### Success response

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "prompt_hash": "example_sha256_hash",
    "expires_at": "2026-05-14T12:00:00.000Z",
    "ttl_days": 7,
    "updated": true
  }
}
```

### Notes on `updated`

- `updated: false` means a brand-new cache entry was created
- `updated: true` means an existing cache entry was replaced

### Validation error response

Status: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Fields 'prompt' and 'response' must be non-empty strings. 'ttl_days' must be a positive integer if provided."
  }
}
```

---

## `DELETE /cache`

### Purpose

Delete a cached entry by prompt.

### Auth

Required.

### Request body

```json
{
  "prompt": "What is the capital of France?"
}
```

### Why body-based delete

V1 has chosen delete-by-prompt as the product behavior. Since hashing happens on the server, the client sends the raw prompt and the server performs normalization and hash lookup internally.

This is clearer than asking SDK users to know the hash.

### Server behavior

1. Validate `prompt`
2. Normalize prompt
3. Hash normalized prompt
4. Delete the matching row if it exists

### Success response: deleted

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "prompt_hash": "example_sha256_hash"
  }
}
```

### Success response: nothing to delete

Status: `200 OK`

```json
{
  "success": true,
  "data": {
    "deleted": false,
    "prompt_hash": "example_sha256_hash"
  }
}
```

### Validation error response

Status: `400 Bad Request`

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Field 'prompt' is required and must be a non-empty string."
  }
}
```

---

## Data Field Notes

### `hits`

- Starts at `0` on a new insert
- Increments only on valid non-expired cache hits from `GET /cache`
- Does not increment on misses
- Does not increment on `POST /cache`

### `created_at`

Recommended V1 behavior:

- preserve the original `created_at` when an existing row is updated

Reason:

- `created_at` should represent when the cache key first entered the system
- TTL refresh behavior should be tracked by `expires_at`, not by rewriting creation history

### `expires_at`

- calculated from current server time plus `ttl_days`
- recalculated on every successful duplicate replacement

---

## Example End-to-End Flow

### First request

Client:

```http
GET /cache?prompt=What%20is%20the%20capital%20of%20France%3F
```

Server:

```json
{
  "success": true,
  "hit": false,
  "response": null
}
```

App then calls the LLM, gets `"Paris"`, and stores it:

```http
POST /cache
```

```json
{
  "prompt": "What is the capital of France?",
  "response": "Paris",
  "ttl_days": 7
}
```

Server:

```json
{
  "success": true,
  "data": {
    "prompt_hash": "example_sha256_hash",
    "expires_at": "2026-05-14T12:00:00.000Z",
    "ttl_days": 7,
    "updated": false
  }
}
```

### Second request

Client:

```http
GET /cache?prompt= what is the capital of france!!! 
```

Server:

```json
{
  "success": true,
  "hit": true,
  "response": "Paris",
  "meta": {
    "hits": 1,
    "created_at": "2026-05-07T12:00:00.000Z",
    "expires_at": "2026-05-14T12:00:00.000Z"
  }
}
```

### Delete request

Client:

```http
DELETE /cache
```

```json
{
  "prompt": "What is the capital of France?"
}
```

Server:

```json
{
  "success": true,
  "data": {
    "deleted": true,
    "prompt_hash": "example_sha256_hash"
  }
}
```

---

## Open Implementation Notes

These are not blockers for coding, but they should be handled consistently:

- whether `DELETE /cache` should accept a JSON body in Express directly or use `POST /cache/delete` instead
- whether `ttl_days` should have an upper bound in V1
- whether response metadata from `GET /cache` should be minimal or verbose

Recommended default choices:

- keep `DELETE /cache` with JSON body
- no TTL upper bound in V1, only require a positive integer
- keep hit response metadata minimal but useful
