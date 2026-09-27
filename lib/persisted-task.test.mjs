import test from "node:test";
import assert from "node:assert/strict";
import { normalizePersistedTask } from "./persisted-task.mjs";

test("normalizes a valid persisted task", () => {
  const result = normalizePersistedTask({
    id: "t1",
    agent_id: "printshop-engineer",
    message: "inspect",
    status: "queued",
    created_at: "2026-09-27T10:00:00.000Z",
    updated_at: "2026-09-27T10:01:00.000Z",
  });
  assert.deepEqual(result, {
    id: "t1",
    agentId: "printshop-engineer",
    message: "inspect",
    status: "queued",
    createdAt: "2026-09-27T10:00:00.000Z",
    updatedAt: "2026-09-27T10:01:00.000Z",
  });
});

test("rejects incomplete persisted tasks", () => {
  assert.throws(
    () => normalizePersistedTask({ id: "t1", status: "queued" }),
    /invalid persisted task/
  );
});

test("rejects unknown task status", () => {
  assert.throws(
    () => normalizePersistedTask({
      id: "t1",
      agent_id: "printshop-engineer",
      message: "inspect",
      status: "unknown",
      created_at: "2026-09-27T10:00:00.000Z",
      updated_at: "2026-09-27T10:00:00.000Z",
    }),
    /invalid persisted task/
  );
});
