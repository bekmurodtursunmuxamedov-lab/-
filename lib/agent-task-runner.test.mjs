import test from "node:test";
import assert from "node:assert/strict";
import { enqueueTask } from "./agent-task-queue.ts";
import { runTask } from "./agent-task-runner.ts";
import { clearEvents } from "./agent-event-bus.mjs";

test("runTask returns the lifecycle events it emitted", () => {
  clearEvents();
  const task = enqueueTask("printshop-engineer", "inspect safe area");
  const result = runTask(task.id);

  assert.ok(result);
  assert.deepEqual(result.events.map((event) => event.type), [
    "task.started",
    "task.completed",
  ]);
  assert.ok(result.events.every((event) => event.taskId === task.id));
});

test("runTask returns a failed lifecycle event for protected tasks", () => {
  clearEvents();
  const task = enqueueTask("printshop-engineer", "inspect production database");
  const result = runTask(task.id);

  assert.ok(result);
  assert.equal(result.ok, false);
  assert.deepEqual(result.events.map((event) => event.type), [
    "task.started",
    "task.failed",
  ]);
});
