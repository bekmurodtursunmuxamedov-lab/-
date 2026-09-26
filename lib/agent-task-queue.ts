export type AgentTaskStatus = "queued" | "running" | "completed" | "failed";

export type AgentTask = {
  id: string;
  agentId: string;
  message: string;
  status: AgentTaskStatus;
  createdAt: string;
  updatedAt: string;
};

const tasks = new Map<string, AgentTask>();

export function enqueueTask(agentId: string, message: string): AgentTask {
  const now = new Date().toISOString();
  const task: AgentTask = {
    id: crypto.randomUUID(),
    agentId,
    message: message.trim(),
    status: "queued",
    createdAt: now,
    updatedAt: now,
  };
  tasks.set(task.id, task);
  return task;
}

export function listTasks(agentId?: string): AgentTask[] {
  return Array.from(tasks.values())
    .filter((task) => !agentId || task.agentId === agentId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export function updateTaskStatus(id: string, status: AgentTaskStatus): AgentTask | null {
  const task = tasks.get(id);
  if (!task) return null;
  const updated = { ...task, status, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

export function getTask(id: string): AgentTask | null {
  return tasks.get(id) ?? null;
}
