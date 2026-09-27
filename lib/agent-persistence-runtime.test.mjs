import test from "node:test";
import assert from "node:assert/strict";
import { persistAgent, persistTask, persistEvent } from "./agent-persistence-runtime.mjs";

test("persistence runtime no-ops safely when the dedicated store is unavailable", async () => {
  const taskResult = await persistTask({ id: "t1" }, {});
  assert.equal(taskResult.persisted, false);
  assert.equal(taskResult.state, "not-configured");

  const eventResult = await persistEvent({ id: "e1" }, {});
  assert.equal(eventResult.persisted, false);
  assert.equal(eventResult.state, "not-configured");
});

test("persistence runtime reports successful agent persistence", async () => {
  let calls = 0;
  const fetchImpl = async (_input, init) => {
    calls += 1;
    assert.equal(init.method, "POST");
    const body = JSON.parse(init.body);
    assert.equal(body[0].protected_areas.length, 1);
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await persistAgent(
    {
      id: "printshop-engineer",
      name: "PRINTSHOP Engineer",
      role: "Autonomous web engineer",
      status: "active",
      target: "bekmurodtursunmuxamedov-lab/print-style-uz",
      capabilities: ["inspect"],
      protectedAreas: ["constructor"],
    },
    {
      AGENT_HUB_SUPABASE_URL: "https://agent-hub.example",
      AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
    },
    fetchImpl,
  );

  assert.equal(calls, 1);
  assert.equal(result.persisted, true);
  assert.equal(result.state, "configured");
});

test("persistence runtime reports successful task persistence", async () => {
  let calls = 0;
  const fetchImpl = async (_input, init) => {
    calls += 1;
    assert.equal(init.method, "POST");
    assert.match(init.body, /agent_id/);
    return new Response("[]", {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const result = await persistTask(
    {
      id: "t1",
      agentId: "printshop-engineer",
      message: "inspect",
      status: "queued",
      createdAt: "2026-09-27T10:00:00.000Z",
      updatedAt: "2026-09-27T10:00:00.000Z",
    },
    {
      AGENT_HUB_SUPABASE_URL: "https://agent-hub.example",
      AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
    },
    fetchImpl,
  );

  assert.equal(calls, 1);
  assert.equal(result.persisted, true);
  assert.equal(result.state, "configured");
});

test("persistence runtime contains store failures instead of breaking the agent cycle", async () => {
  const result = await persistEvent(
    { id: "e1", type: "task.completed", agentId: "printshop-engineer", createdAt: "2026-09-27T10:00:00.000Z" },
    {
      AGENT_HUB_SUPABASE_URL: "https://agent-hub.example",
      AGENT_HUB_SUPABASE_SERVER_KEY: "server-secret",
    },
    async () => new Response("backend failure", { status: 503 }),
  );

  assert.equal(result.persisted, false);
  assert.equal(result.state, "error");
  assert.match(result.reason, /503/);
});
