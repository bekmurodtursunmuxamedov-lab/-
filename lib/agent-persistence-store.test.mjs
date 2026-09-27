import test from "node:test";
import assert from "node:assert/strict";
import { createAgentHubPersistenceStore } from "./agent-persistence-store.mjs";

test("store stays fail-closed when persistence is not configured", async () => {
  const store = createAgentHubPersistenceStore({});
  assert.equal(store.ready, false);
  await assert.rejects(
    () => store.listTasks(),
    /Persistence is not configured/
  );
});

test("store uses the dedicated Supabase REST endpoint and maps task rows", async () => {
  const requests = [];
  const store = createAgentHubPersistenceStore(
    {
      AGENT_HUB_SUPABASE_URL: "https://agent-hub.example",
      AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
    },
    async (input, init) => {
      requests.push({ input: String(input), init });
      return new Response(JSON.stringify([{
        id: "t1",
        agent_id: "printshop-engineer",
        message: "inspect",
        status: "queued",
        created_at: "2026-09-27T10:00:00.000Z",
        updated_at: "2026-09-27T10:00:00.000Z",
      }]), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );

  const tasks = await store.listTasks("printshop-engineer");
  assert.deepEqual(tasks, [{
    id: "t1",
    agentId: "printshop-engineer",
    message: "inspect",
    status: "queued",
    createdAt: "2026-09-27T10:00:00.000Z",
    updatedAt: "2026-09-27T10:00:00.000Z",
  }]);
  assert.equal(requests.length, 1);
  assert.match(requests[0].input, /agent_tasks\?select=\*/);
  assert.match(requests[0].input, /agent_id=eq\.printshop-engineer/);
  assert.equal(requests[0].init.headers.apikey, "server-secret");
  assert.equal(requests[0].init.headers.Authorization, "Bearer server-secret");
});

test("store writes task fields using the SQL schema column names", async () => {
  let request;
  const store = createAgentHubPersistenceStore(
    {
      AGENT_HUB_SUPABASE_URL: "https://agent-hub.example",
      AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
    },
    async (input, init) => {
      request = { input: String(input), init };
      return new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );

  await store.upsertTask({
    id: "task-1",
    agentId: "printshop-engineer",
    message: "inspect",
    status: "queued",
    createdAt: "2026-09-27T10:00:00.000Z",
    updatedAt: "2026-09-27T10:00:00.000Z",
  });

  const body = JSON.parse(request.init.body);
  assert.equal(body[0].agent_id, "printshop-engineer");
  assert.equal(body[0].created_at, "2026-09-27T10:00:00.000Z");
  assert.equal(body[0].updated_at, "2026-09-27T10:00:00.000Z");
  assert.equal(body[0].agentId, undefined);
  assert.equal(request.init.method, "POST");
});

test("store writes events using the SQL schema column names", async () => {
  let request;
  const store = createAgentHubPersistenceStore(
    {
      AGENT_HUB_SUPABASE_URL: "https://agent-hub.example/",
      AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
    },
    async (input, init) => {
      request = { input: String(input), init };
      return new Response("[]", {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
  );

  await store.appendEvent({
    id: "event-1",
    type: "task.completed",
    agentId: "printshop-engineer",
    taskId: "task-1",
    payload: { ok: true },
    createdAt: "2026-09-27T10:00:00.000Z",
  });

  assert.equal(request.init.method, "POST");
  assert.match(request.input, /agent_events$/);
  assert.equal(request.init.headers.apikey, "server-secret");
  const body = JSON.parse(request.init.body);
  assert.equal(body[0].id, "event-1");
  assert.equal(body[0].type, "task.completed");
  assert.equal(body[0].agent_id, "printshop-engineer");
  assert.equal(body[0].task_id, "task-1");
  assert.equal(body[0].created_at, "2026-09-27T10:00:00.000Z");
  assert.equal(body[0].agentId, undefined);
});
