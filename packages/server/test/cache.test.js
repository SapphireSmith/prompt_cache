const assert = require("node:assert/strict");
const http = require("node:http");
const { afterEach, test } = require("node:test");

const { createApp } = require("../dist/app");

const testEnv = {
  apiKey: "test-api-key",
  defaultTtlDays: 7,
  port: 3000,
  supabaseAnonKey: "unused",
  supabaseUrl: "unused"
};

const activeServers = new Set();

afterEach(async () => {
  await Promise.all(Array.from(activeServers, (server) => closeServer(server)));
  activeServers.clear();
});

test("GET /health returns ok", async () => {
  const { baseUrl } = await startTestServer(new FakeCacheStore());
  const response = await fetch(`${baseUrl}/health`);

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    status: "ok"
  });
});

test("GET /cache returns a miss when no entry exists", async () => {
  const { baseUrl } = await startTestServer(new FakeCacheStore());
  const response = await fetch(`${baseUrl}/cache?prompt=What%20is%20AI%3F`, {
    headers: authHeaders()
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    hit: false,
    response: null
  });
});

test("POST /cache stores an entry and GET /cache returns a hit", async () => {
  const cacheStore = new FakeCacheStore();
  const { baseUrl } = await startTestServer(cacheStore);

  const postResponse = await fetch(`${baseUrl}/cache`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      prompt: "What is AI?",
      response: "Artificial intelligence.",
      ttl_days: 5
    })
  });

  assert.equal(postResponse.status, 200);
  const postBody = await postResponse.json();
  assert.equal(postBody.success, true);
  assert.equal(postBody.data.ttl_days, 5);
  assert.equal(postBody.data.updated, false);

  const getResponse = await fetch(`${baseUrl}/cache?prompt= what is ai!!! `, {
    headers: authHeaders()
  });

  assert.equal(getResponse.status, 200);
  assert.deepEqual(await getResponse.json(), {
    success: true,
    hit: true,
    response: "Artificial intelligence.",
    meta: {
      hits: 1,
      created_at: cacheStore.createdAt,
      expires_at: postBody.data.expires_at
    }
  });
});

test("repeated GET /cache increments hits", async () => {
  const cacheStore = new FakeCacheStore();
  cacheStore.seed({
    prompt_hash: "f6d6f54dc38cb50d96ef24ac793aaf4338a6e672ee2785e1fa08a1bfab68f50b",
    prompt_text: "What is AI?",
    response: "Artificial intelligence.",
    ttl_days: 7,
    expires_at: futureIso()
  });

  const { baseUrl } = await startTestServer(cacheStore);

  const firstResponse = await fetch(`${baseUrl}/cache?prompt=What%20is%20AI%3F`, {
    headers: authHeaders()
  });
  const secondResponse = await fetch(`${baseUrl}/cache?prompt=What%20is%20AI%3F`, {
    headers: authHeaders()
  });

  assert.equal((await firstResponse.json()).meta.hits, 1);
  assert.equal((await secondResponse.json()).meta.hits, 2);
});

test("expired entries are treated as misses", async () => {
  const cacheStore = new FakeCacheStore();
  cacheStore.seed({
    prompt_hash: "f6d6f54dc38cb50d96ef24ac793aaf4338a6e672ee2785e1fa08a1bfab68f50b",
    prompt_text: "What is AI?",
    response: "Expired response.",
    ttl_days: 7,
    expires_at: pastIso()
  });

  const { baseUrl } = await startTestServer(cacheStore);
  const response = await fetch(`${baseUrl}/cache?prompt=What%20is%20AI%3F`, {
    headers: authHeaders()
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    hit: false,
    response: null
  });
});

test("DELETE /cache removes an entry", async () => {
  const cacheStore = new FakeCacheStore();
  cacheStore.seed({
    prompt_hash: "f6d6f54dc38cb50d96ef24ac793aaf4338a6e672ee2785e1fa08a1bfab68f50b",
    prompt_text: "What is AI?",
    response: "Artificial intelligence.",
    ttl_days: 7,
    expires_at: futureIso()
  });

  const { baseUrl } = await startTestServer(cacheStore);

  const deleteResponse = await fetch(`${baseUrl}/cache`, {
    method: "DELETE",
    headers: jsonHeaders(),
    body: JSON.stringify({ prompt: "What is AI?" })
  });

  assert.equal(deleteResponse.status, 200);
  assert.deepEqual(await deleteResponse.json(), {
    success: true,
    data: {
      deleted: true,
      prompt_hash: "f6d6f54dc38cb50d96ef24ac793aaf4338a6e672ee2785e1fa08a1bfab68f50b"
    }
  });

  const getResponse = await fetch(`${baseUrl}/cache?prompt=What%20is%20AI%3F`, {
    headers: authHeaders()
  });

  assert.deepEqual(await getResponse.json(), {
    success: true,
    hit: false,
    response: null
  });
});

test("protected routes reject invalid API keys", async () => {
  const { baseUrl } = await startTestServer(new FakeCacheStore());
  const response = await fetch(`${baseUrl}/cache?prompt=What%20is%20AI%3F`, {
    headers: { "x-api-key": "wrong-key" }
  });

  assert.equal(response.status, 401);
  assert.deepEqual(await response.json(), {
    success: false,
    error: {
      code: "UNAUTHORIZED",
      message: "Invalid or missing API key."
    }
  });
});

test("invalid cache payloads return validation errors", async () => {
  const { baseUrl } = await startTestServer(new FakeCacheStore());

  const getResponse = await fetch(`${baseUrl}/cache`, {
    headers: authHeaders()
  });
  const postResponse = await fetch(`${baseUrl}/cache`, {
    method: "POST",
    headers: jsonHeaders(),
    body: JSON.stringify({
      prompt: "",
      response: ""
    })
  });
  const deleteResponse = await fetch(`${baseUrl}/cache`, {
    method: "DELETE",
    headers: jsonHeaders(),
    body: JSON.stringify({
      prompt: ""
    })
  });

  assert.equal(getResponse.status, 400);
  assert.equal(postResponse.status, 400);
  assert.equal(deleteResponse.status, 400);
});

async function startTestServer(cacheStore) {
  const app = createApp(testEnv, {
    getDbClient: () => cacheStore.createClient()
  });
  const server = http.createServer(app);

  await new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve());
  });

  activeServers.add(server);

  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Expected an address object from the test server.");
  }

  return {
    baseUrl: `http://127.0.0.1:${address.port}`
  };
}

function authHeaders() {
  return { "x-api-key": testEnv.apiKey };
}

function jsonHeaders() {
  return {
    ...authHeaders(),
    "content-type": "application/json"
  };
}

function futureIso() {
  return new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
}

function pastIso() {
  return new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
}

function closeServer(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

class FakeCacheStore {
  constructor() {
    this.rows = new Map();
    this.createdAt = "2026-05-29T00:00:00.000Z";
  }

  createClient() {
    return new FakeSupabaseClient(this);
  }

  seed(row) {
    this.rows.set(row.prompt_hash, {
      id: this.rows.size + 1,
      prompt_hash: row.prompt_hash,
      prompt_text: row.prompt_text,
      response: row.response,
      hits: 0,
      ttl_days: row.ttl_days,
      created_at: this.createdAt,
      expires_at: row.expires_at
    });
  }

  select(promptHash, columns) {
    const row = this.rows.get(promptHash);
    if (!row) {
      return [];
    }

    if (columns === "id") {
      return [{ id: row.id }];
    }

    if (columns === "prompt_hash") {
      return [{ prompt_hash: row.prompt_hash }];
    }

    return [{
      response: row.response,
      hits: row.hits,
      created_at: row.created_at,
      expires_at: row.expires_at
    }];
  }

  update(promptHash, updates) {
    const existing = this.rows.get(promptHash);
    if (!existing) {
      return;
    }

    this.rows.set(promptHash, {
      ...existing,
      ...updates
    });
  }

  insert(row) {
    this.rows.set(row.prompt_hash, {
      id: this.rows.size + 1,
      prompt_hash: row.prompt_hash,
      prompt_text: row.prompt_text,
      response: row.response,
      hits: 0,
      ttl_days: row.ttl_days,
      created_at: this.createdAt,
      expires_at: row.expires_at
    });
  }

  delete(promptHash) {
    return this.rows.delete(promptHash);
  }
}

class FakeSupabaseClient {
  constructor(cacheStore) {
    this.cacheStore = cacheStore;
  }

  from(tableName) {
    if (tableName !== "cache") {
      throw new Error(`Unexpected table ${tableName} in test client.`);
    }

    return new FakeQueryBuilder(this.cacheStore);
  }
}

class FakeQueryBuilder {
  constructor(cacheStore) {
    this.cacheStore = cacheStore;
    this.columns = null;
    this.mode = "select";
    this.promptHash = null;
    this.updates = null;
  }

  select(columns) {
    if (this.mode === "delete") {
      const deleted = this.promptHash ? this.cacheStore.delete(this.promptHash) : false;
      return Promise.resolve({
        data: deleted && this.promptHash ? [{ prompt_hash: this.promptHash }] : [],
        error: null
      });
    }

    this.columns = columns;
    return this;
  }

  eq(field, value) {
    if (field !== "prompt_hash") {
      throw new Error(`Unexpected filter field ${field} in test client.`);
    }

    this.promptHash = value;

    if (this.mode === "update") {
      this.cacheStore.update(value, this.updates ?? {});
      return Promise.resolve({ error: null });
    }

    return this;
  }

  limit() {
    if (!this.promptHash || !this.columns) {
      throw new Error("Missing query state for select().limit().");
    }

    return Promise.resolve({
      data: this.cacheStore.select(this.promptHash, this.columns),
      error: null
    });
  }

  update(updates) {
    this.mode = "update";
    this.updates = updates;
    return this;
  }

  insert(row) {
    this.cacheStore.insert(row);
    return Promise.resolve({ error: null });
  }

  delete() {
    this.mode = "delete";
    return this;
  }
}
