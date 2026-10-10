export async function getSupabaseStatus() {
  const url = process.env.AGENT_HUB_SUPABASE_URL;
  const key = process.env.AGENT_HUB_SUPABASE_SERVER_KEY;

  if (!url || !key) {
    throw new Error("Agent Hub Supabase credentials are not configured");
  }

  // This check targets only the Agent Hub's own store. Never query PRINTSHOP tables.
  const response = await fetch(
    `${url.replace(/\/+$/, "")}/rest/v1/agent_registry?select=id&limit=1`,
    {
      headers: { apikey: key, Authorization: `Bearer ${key}` },
      cache: "no-store",
    },
  );

  return {
    connected: response.ok,
    projectId: new URL(url).hostname.split(".")[0],
    httpStatus: response.status,
    checkedEndpoint: "agent_registry",
  };
}
