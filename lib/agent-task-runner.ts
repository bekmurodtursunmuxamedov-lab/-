import { getAgent } from "./agent-registry-store";
import { getTask, updateTaskStatus, type AgentTask } from "./agent-task-queue";

export type TaskRunResult = {
  ok: boolean;
  task: AgentTask;
  stages: string[];
  nextAction: string;
  productionWrites: false;
};

const stages = ["inspect", "security", "plan", "verify"];

export function runTask(taskId: string): TaskRunResult | null {
  const task = getTask(taskId);
  if (!task) return null;

  const agent = getAgent(task.agentId);
  if (!agent || agent.status !== "active") {
    const failed = updateTaskStatus(task.id, "failed") ?? task;
    return { ok: false, task: failed, stages: [], nextAction: "agent-not-active", productionWrites: false };
  }

  updateTaskStatus(task.id, "running");
  const running = getTask(task.id) ?? task;

  const protectedTask = /constructor|production\s*(db|database)|auth|payment|order/i.test(task.message);
  if (protectedTask) {
    const failed = updateTaskStatus(task.id, "failed") ?? running;
    return { ok: false, task: failed, stages, nextAction: "human-review-required", productionWrites: false };
  }

  const completed = updateTaskStatus(task.id, "completed") ?? running;
  return {
    ok: true,
    task: completed,
    stages,
    nextAction: "continue-with-safe-pipeline",
    productionWrites: false,
  };
}
