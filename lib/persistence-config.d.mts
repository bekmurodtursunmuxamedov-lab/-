export type PersistenceConfigState = {
  state: "configured" | "misconfigured" | "not-configured";
  provider: "supabase" | "none";
  ready: boolean;
  reason: string;
};

export function getPersistenceConfig(
  env?: Record<string, string | undefined>,
): PersistenceConfigState;
