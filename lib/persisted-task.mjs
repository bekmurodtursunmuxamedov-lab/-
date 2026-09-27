const STATUSES = new Set(["queued", "running", "completed", "failed"]);

export function normalizePersistedTask(row) {
  if (
    !row ||
    typeof row.id !== "string" ||
    typeof row.agent_id !== "string" ||
    typeof row.message !== "string" ||
    !STATUSES.has(row.status) ||
    typeof row.created_at !== "string" ||
    typeof row.updated_at !== "string"
  ) {
    throw new Error("invalid persisted task");
  }

  return {
    id: row.id,
    agentId: row.agent_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
