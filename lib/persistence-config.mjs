export function getPersistenceConfig(env = process.env) {
  const url = String(env.AGENT_HUB_SUPABASE_URL ?? "").trim();
  const key = String(env.AGENT_HUB_SUPABASE_SERVER_KEY ?? "").trim();

  if (!url && !key) {
    return {
      state: "not-configured",
      provider: "none",
      ready: false,
      reason: "Dedicated Agent Hub Supabase credentials are not configured.",
    };
  }

  if (!url || !key) {
    return {
      state: "misconfigured",
      provider: "supabase",
      ready: false,
      reason: "Both AGENT_HUB_SUPABASE_URL and AGENT_HUB_SUPABASE_SERVER_KEY are required.",
    };
  }

  return {
    state: "configured",
    provider: "supabase",
    ready: true,
    reason: "Dedicated Agent Hub Supabase credentials are configured.",
  };
}
