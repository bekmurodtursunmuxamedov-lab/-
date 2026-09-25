import { PRINTSHOP_TARGET } from "./integration-spec";

export async function getSupabaseStatus() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Supabase credentials are not configured");
  const response = await fetch(`${url}/rest/v1/products?select=id&limit=1`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    cache: "no-store",
  });
  return {
    connected: response.ok,
    projectId: PRINTSHOP_TARGET.supabaseProject,
    httpStatus: response.status,
    checkedEndpoint: "products",
  };
}