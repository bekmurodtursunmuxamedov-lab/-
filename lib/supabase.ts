const SUPABASE_URL = process.env.SUPABASE_URL || "https://hedcbhmyohofmoqworgy.supabase.co";

function getKey() {
  return (
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    ""
  );
}

export async function getSupabaseStatus() {
  const key = getKey();
  if (!key) throw new Error("Supabase API key is not configured");

  const response = await fetch(`${SUPABASE_URL.replace(/\/$/, "")}/rest/v1/`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
    },
    cache: "no-store",
  });

  if (!response.ok) throw new Error(`Supabase Data API ${response.status}`);

  const schema = await response.json().catch(() => null);
  const definitions = schema && typeof schema === "object" && "definitions" in schema
    ? (schema as { definitions?: Record<string, unknown> }).definitions
    : undefined;

  return {
    connected: true,
    projectRef: SUPABASE_URL.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] || null,
    dataApi: true,
    exposedResources: definitions ? Object.keys(definitions).length : 0,
    readOnly: true,
  };
}
