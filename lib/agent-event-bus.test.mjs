import test from "node:test";
import assert from "node:assert/strict";
import { emitEvent, listEvents } from "./agent-event-bus.mjs";

test("stores an emitted agent event in memory", () => {
  const event = emitEvent({
    type: "task.queued",
    agentId: "printshop-engineer",
    taskId: "task-1",
  });

  assert.equal(event.type, "task.queued");
  assert.equal(event.agentId, "printshop-engineer");
  assert.equal(listEvents("printshop-engineer")[0].taskId, "task-1");
});
