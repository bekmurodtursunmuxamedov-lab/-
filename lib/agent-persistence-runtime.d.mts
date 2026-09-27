import type { NormalizedTask } from "./persisted-task.mjs";

export type PersistenceRuntimeResult = {
  persisted: boolean;
  state: "configured" | "misconfigured" | "not-configured" | "error";
  reason: string;
};

export type PersistedTasksResult = PersistenceRuntimeResult & {
  tasks: NormalizedTask[];
};

export type PersistedEventsResult = PersistenceRuntimeResult & {
  events: unknown[];
};

export function persistAgent(agent: unknown, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<PersistenceRuntimeResult>;
export function persistTask(task: unknown, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<PersistenceRuntimeResult>;
export function persistEvent(event: unknown, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<PersistenceRuntimeResult>;
export function listPersistedEvents(agentId?: string, type?: string, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<PersistedEventsResult>;
export function listPersistedTasks(agentId?: string, env?: Record<string, string | undefined>, fetchImpl?: typeof fetch): Promise<PersistedTasksResult>;
