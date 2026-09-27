import { createAgentHubPersistenceStore } from "./agent-persistence-store.mjs";

function failure(reason, state = "error") {
  return { persisted: false, state, reason };
}

async function persist(operation, env = process.env, fetchImpl = fetch) {
  const store = createAgentHubPersistenceStore(env, fetchImpl);
  if (!store.ready) return failure(store.reason, store.state);

  try {
    await operation(store);
    return { persisted: true, state: "configured", reason: store.reason };
  } catch (error) {
    return failure(error instanceof Error ? error.message : "Persistence request failed.");
  }
}

export async function checkPersistenceConnection(env = process.env, fetchImpl = fetch) {
  const store = createAgentHubPersistenceStore(env, fetchImpl);
  if (!store.ready) {
    return {
      configured: false,
      connected: false,
      state: store.state,
      reason: store.reason,
    };
  }

  try {
    const url = new URL(
      `${String(env.AGENT_HUB_SUPABASE_URL).trim().replace(/\/+$/, "")}/rest/v1/agent_registry?select=id&limit=1`,
    );
    const response = await fetchImpl(url, {
      headers: {
        apikey: String(env.AGENT_HUB_SUPABASE_SERVER_KEY).trim(),
        Authorization: `Bearer ${String(env.AGENT_HUB_SUPABASE_SERVER_KEY).trim()}`,
      },
    });

    if (!response.ok) {
      return {
        configured: true,
        connected: false,
        state: "error",
        reason: `Dedicated Agent Hub Supabase Data API returned HTTP ${response.status}.`,
      };
    }

    return {
      configured: true,
      connected: true,
      state: "configured",
      reason: "Dedicated Agent Hub Supabase Data API is reachable.",
    };
  } catch (error) {
    return {
      configured: true,
      connected: false,
      state: "error",
      reason: error instanceof Error ? "Dedicated Agent Hub Supabase Data API is unreachable." : "Dedicated Agent Hub Supabase Data API is unreachable.",
    };
  }
}

export async function persistAgent(agent, env = process.env, fetchImpl = fetch) {
  return persist((store) => store.upsertAgent(agent), env, fetchImpl);
}

export async function persistTask(task, env = process.env, fetchImpl = fetch) {
  return persist((store) => store.upsertTask(task), env, fetchImpl);
}

export async function persistEvent(event, env = process.env, fetchImpl = fetch) {
  return persist((store) => store.appendEvent(event), env, fetchImpl);
}

export async function listPersistedEvents(agentId, type, env = process.env, fetchImpl = fetch) {
  const store = createAgentHubPersistenceStore(env, fetchImpl);
  if (!store.ready) return { persisted: false, state: store.state, reason: store.reason, events: [] };

  try {
    const url = new URL(`${String(env.AGENT_HUB_SUPABASE_URL).trim().replace(/\/+$/, "")}/rest/v1/agent_events`);
    url.searchParams.set("select", "*");
    if (agentId) url.searchParams.set("agent_id", `eq.${agentId}`);
    if (type) url.searchParams.set("type", `eq.${type}`);
    url.searchParams.set("order", "created_at.desc");

    const response = await fetchImpl(url, {
      headers: {
        apikey: String(env.AGENT_HUB_SUPABASE_SERVER_KEY).trim(),
        Authorization: `Bearer ${String(env.AGENT_HUB_SUPABASE_SERVER_KEY).trim()}`,
      },
    });
    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(`Persistence request failed (${response.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
    }

    const rows = await response.json();
    const events = Array.isArray(rows) ? rows.map((row) => ({
      id: row.id,
      type: row.type,
      agentId: row.agent_id,
      taskId: row.task_id ?? undefined,
      payload: row.payload ?? {},
      createdAt: row.created_at,
    })) : [];

    return { persisted: true, state: "configured", reason: store.reason, events };
  } catch (error) {
    return {
      persisted: false,
      state: "error",
      reason: error instanceof Error ? error.message : "Persistence request failed.",
      events: [],
    };
  }
}

export async function listPersistedTasks(agentId, env = process.env, fetchImpl = fetch) {
  const store = createAgentHubPersistenceStore(env, fetchImpl);
  if (!store.ready) return { persisted: false, state: store.state, reason: store.reason, tasks: [] };

  try {
    const tasks = await store.listTasks(agentId);
    return { persisted: true, state: "configured", reason: store.reason, tasks: Array.isArray(tasks) ? tasks : [] };
  } catch (error) {
    return {
      persisted: false,
      state: "error",
      reason: error instanceof Error ? error.message : "Persistence request failed.",
      tasks: [],
    };
  }
}
