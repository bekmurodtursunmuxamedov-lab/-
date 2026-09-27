import { getAgent } from "./agent-registry-store";
import { emitEvent, type AgentEvent } from "./agent-event-bus.mjs";
import { getTask, updateTaskStatus, type AgentTask } from "./agent-task-queue";

export type TaskRunResult = {
  ok: boolean;
  task: AgentTask;
  stages: string[];
  nextAction: string;
  events: AgentEvent[];
  productionWrites: false;
};

const stages = ["inspect", "security", "plan", "verify"];

export function runTask(taskId: string): TaskRunResult | null {
  const task = getTask(taskId);
  if (!task) return null;

  const events: AgentEvent[] = [];
  const agent = getAgent(task.agentId);
  if (!agent || agent.status !== "active") {
    const failed = updateTaskStatus(task.id, "failed") ?? task;
    return {
      ok: false,
      task: failed,
      stages: [],
      nextAction: "agent-not-active",
      events,
      productionWrites: false,
    };
  }

  updateTaskStatus(task.id, "running");
  const running = getTask(task.id) ?? task;
  events.push(emitEvent({
    type: "task.started",
    agentId: task.agentId,
    taskId: task.id,
  }));

  const protectedTask = /constructor|production\s*(db|database)|auth|payment|order/i.test(task.message);
  if (protectedTask) {
    const failed = updateTaskStatus(task.id, "failed") ?? running;
    events.push(emitEvent({
      type: "task.failed",
      agentId: task.agentId,
      taskId: task.id,
      payload: { reason: "protected-area" },
    }));
    return {
      ok: false,
      task: failed,
      stages,
      nextAction: "human-review-required",
      events,
      productionWrites: false,
    };
  }

  const completed = updateTaskStatus(task.id, "completed") ?? running;
  events.push(emitEvent({
    type: "task.completed",
    agentId: task.agentId,
    taskId: task.id,
  }));

  return {
    ok: true,
    task: completed,
    stages,
    nextAction: "continue-with-safe-pipeline",
    events,
    productionWrites: false,
  };
}
