import { getPersistenceConfig } from "./persistence-config.mjs";

const TABLES = {
  agents: "agent_registry",
  tasks: "agent_tasks",
  events: "agent_events",
};

function buildConfig(env) {
  const config = getPersistenceConfig(env);
  if (!config.ready) {
    throw new Error(`Persistence is not configured: ${config.reason}`);
  }
  return {
    baseUrl: String(env.AGENT_HUB_SUPABASE_URL).trim().replace(/\/+$/, ""),
    key: String(env.AGENT_HUB_SUPABASE_SERVER_KEY).trim(),
  };
}

function headers(key, extra = {}) {
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    ...extra,
  };
}

async function requestJson(fetchImpl, url, key, init = {}) {
  const response = await fetchImpl(url, {
    ...init,
    headers: headers(key, init.headers || {}),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Persistence request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
  }

  const contentType = response.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) return null;
  return response.json();
}

function queryUrl(baseUrl, table, params = {}) {
  const url = new URL(`/rest/v1/${table}`, baseUrl);
  url.searchParams.set("select", "*");
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

function toAgentRow(agent) {
  return {
    id: agent.id,
    name: agent.name,
    role: agent.role,
    status: agent.status,
    target: agent.target,
    capabilities: agent.capabilities ?? [],
    protected_areas: agent.protectedAreas ?? agent.protected_areas ?? [],
    updated_at: agent.updatedAt ?? agent.updated_at ?? new Date().toISOString(),
  };
}

function fromAgentRow(row) {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    status: row.status,
    target: row.target,
    capabilities: row.capabilities ?? [],
    protectedAreas: row.protected_areas ?? [],
    updatedAt: row.updated_at,
  };
}

function toTaskRow(task) {
  return {
    id: task.id,
    agent_id: task.agentId ?? task.agent_id,
    message: task.message,
    status: task.status,
    created_at: task.createdAt ?? task.created_at,
    updated_at: task.updatedAt ?? task.updated_at,
  };
}

function fromTaskRow(row) {
  return {
    id: row.id,
    agentId: row.agent_id,
    message: row.message,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toEventRow(event) {
  return {
    id: event.id,
    type: event.type,
    agent_id: event.agentId ?? event.agent_id,
    task_id: event.taskId ?? event.task_id ?? null,
    payload: event.payload ?? {},
    created_at: event.createdAt ?? event.created_at,
  };
}

function fromTaskResponse(value) {
  return Array.isArray(value) ? value.map(fromTaskRow) : value;
}

export function createAgentHubPersistenceStore(env = process.env, fetchImpl = fetch) {
  const config = getPersistenceConfig(env);

  if (!config.ready) {
    const error = () => new Error(`Persistence is not configured: ${config.reason}`);
    return {
      ready: false,
      state: config.state,
      reason: config.reason,
      listAgents: async () => { throw error(); },
      upsertAgent: async () => { throw error(); },
      listTasks: async () => { throw error(); },
      upsertTask: async () => { throw error(); },
      appendEvent: async () => { throw error(); },
    };
  }

  const { baseUrl, key } = buildConfig(env);

  return {
    ready: true,
    state: "configured",
    reason: config.reason,

    async listAgents() {
      const value = await requestJson(
        fetchImpl,
        queryUrl(baseUrl, TABLES.agents, { order: "updated_at.desc" }),
        key,
      );
      return Array.isArray(value) ? value.map(fromAgentRow) : value;
    },

    async upsertAgent(agent) {
      return requestJson(
        fetchImpl,
        queryUrl(baseUrl, TABLES.agents),
        key,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify([toAgentRow(agent)]),
        },
      );
    },

    async listTasks(agentId) {
      const value = await requestJson(
        fetchImpl,
        queryUrl(baseUrl, TABLES.tasks, {
          ...(agentId ? { agent_id: `eq.${agentId}` } : {}),
          order: "created_at.desc",
        }),
        key,
      );
      return fromTaskResponse(value);
    },

    async upsertTask(task) {
      return requestJson(
        fetchImpl,
        queryUrl(baseUrl, TABLES.tasks),
        key,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "resolution=merge-duplicates,return=representation",
          },
          body: JSON.stringify([toTaskRow(task)]),
        },
      );
    },

    async appendEvent(event) {
      return requestJson(
        fetchImpl,
        `${baseUrl}/rest/v1/${TABLES.events}`,
        key,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Prefer: "return=representation",
          },
          body: JSON.stringify([toEventRow(event)]),
        },
      );
    },
  };
}
