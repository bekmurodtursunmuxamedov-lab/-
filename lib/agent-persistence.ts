import { getPersistenceConfig, type PersistenceConfigState } from "./persistence-config.mjs";

export type PersistenceStatus = PersistenceConfigState & {
  configured: boolean;
  reason: string;
};

export function getPersistenceStatus(): PersistenceStatus {
  const state = getPersistenceConfig(process.env);

  return {
    ...state,
    configured: state.ready,
  };
}
