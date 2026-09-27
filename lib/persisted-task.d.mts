export type PersistedTaskRow = {
  id: string;
  agent_id: string;
  message: string;
  status: "queued" | "running" | "completed" | "failed";
  created_at: string;
  updated_at: string;
};

export type NormalizedTask = {
  id: string;
  agentId: string;
  message: string;
  status: PersistedTaskRow["status"];
  createdAt: string;
  updatedAt: string;
};

export function normalizePersistedTask(row: PersistedTaskRow): NormalizedTask;
