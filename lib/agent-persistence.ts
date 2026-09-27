import { getPersistenceConfig, type PersistenceConfigState } from "./persistence-config.mjs";
import { checkPersistenceConnection } from "./agent-persistence-runtime.mjs";

export type PersistenceStatus = PersistenceConfigState & {
  configured: boolean;
  connected: boolean;
  reason: string;
};

export async function getPersistenceStatus(): Promise<PersistenceStatus> {
  const state = getPersistenceConfig(process.env);
  if (!state.ready) {
    return {
      ...state,
      configured: false,
      connected: false,
      reason: state.reason,
    };
  }

  const connectivity = await checkPersistenceConnection();
  return {
    ...state,
    configured: connectivity.configured,
    connected: connectivity.connected,
    state: connectivity.state,
    reason: connectivity.reason,
  };
}
