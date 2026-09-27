import test from "node:test";
import assert from "node:assert/strict";
import { restoreTask, getTask } from "./agent-task-queue.ts";

test("restores a persisted task into the runtime queue", () => {
  const task = {
    id: "persisted-task-1",
    agentId: "printshop-engineer",
    message: "inspect",
    status: "queued",
    createdAt: "2026-09-27T10:00:00.000Z",
    updatedAt: "2026-09-27T10:00:00.000Z",
  };

  const restored = restoreTask(task);
  assert.deepEqual(restored, task);
  assert.deepEqual(getTask(task.id), task);
});
