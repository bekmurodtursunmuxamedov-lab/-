export type PersistenceStatus = {
  configured: boolean;
  provider: "supabase" | "none";
  reason: string;
};

export function getPersistenceStatus(): PersistenceStatus {
  const url = process.env.AGENT_HUB_SUPABASE_URL;
  const key = process.env.AGENT_HUB_SUPABASE_SERVER_KEY;

  if (url && key) {
    return {
      configured: true,
      provider: "supabase",
      reason: "Dedicated Agent Hub Supabase credentials are configured.",
    };
  }

  return {
    configured: false,
    provider: "none",
    reason: "Persistence is intentionally disabled until a dedicated Agent Hub database is configured.",
  };
}
