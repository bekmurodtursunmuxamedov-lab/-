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

export function createAgentHubPersistenceStore(env = process.env, fetchImpl = fetch) {
  const config = getPersistenceConfig(env);

  if (!config.ready) {
    return {
      ready: false,
      state: config.state,
      reason: config.reason,
      listAgents: async () => { throw new Error(`Persistence is not configured: ${config.reason}`); },
      upsertAgent: async () => { throw new Error(`Persistence is not configured: ${config.reason}`); },
      listTasks: async () => { throw new Error(`Persistence is not configured: ${config.reason}`); },
      upsertTask: async () => { throw new Error(`Persistence is not configured: ${config.reason}`); },
      appendEvent: async () => { throw new Error(`Persistence is not configured: ${config.reason}`); },
    };
  }

  const { baseUrl, key } = buildConfig(env);

  return {
    ready: true,
    state: "configured",
    reason: config.reason,

    async listAgents() {
      return requestJson(fetchImpl, queryUrl(baseUrl, TABLES.agents, { order: "updated_at.desc" }), key);
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
          body: JSON.stringify([agent]),
        },
      );
    },

    async listTasks(agentId) {
      return requestJson(
        fetchImpl,
        queryUrl(baseUrl, TABLES.tasks, {
          ...(agentId ? { agent_id: `eq.${agentId}` } : {}),
          order: "created_at.desc",
        }),
        key,
      );
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
          body: JSON.stringify([task]),
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
          body: JSON.stringify([event]),
        },
      );
    },
  };
}
