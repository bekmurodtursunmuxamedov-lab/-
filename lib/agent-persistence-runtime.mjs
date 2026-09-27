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

export async function persistAgent(agent, env = process.env, fetchImpl = fetch) {
  return persist((store) => store.upsertAgent(agent), env, fetchImpl);
}

export async function persistTask(task, env = process.env, fetchImpl = fetch) {
  return persist((store) => store.upsertTask(task), env, fetchImpl);
}

export async function persistEvent(event, env = process.env, fetchImpl = fetch) {
  return persist((store) => store.appendEvent(event), env, fetchImpl);
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
