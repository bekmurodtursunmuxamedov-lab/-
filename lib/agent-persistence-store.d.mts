export type PersistenceStore = {
  ready: boolean;
  state: "configured" | "misconfigured" | "not-configured";
  reason: string;
  listAgents: () => Promise<unknown>;
  upsertAgent: (agent: unknown) => Promise<unknown>;
  listTasks: (agentId?: string) => Promise<unknown>;
  upsertTask: (task: unknown) => Promise<unknown>;
  appendEvent: (event: unknown) => Promise<unknown>;
};

export function createAgentHubPersistenceStore(
  env?: Record<string, string | undefined>,
  fetchImpl?: typeof fetch,
): PersistenceStore;
