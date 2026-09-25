import { NextResponse } from "next/server";
import { getGitHubStatus } from "../../../../lib/github";
import { getVercelStatus } from "../../../../lib/vercel";
import { getSupabaseStatus } from "../../../../lib/supabase-health";
import { PRINTSHOP_TARGET } from "../../../../lib/integration-spec";

export const dynamic = "force-dynamic";

export async function GET() {
  const [github, vercel, supabase] = await Promise.allSettled([
    getGitHubStatus(), getVercelStatus(), getSupabaseStatus(),
  ]);
  const safe = (r: PromiseSettledResult<any>) =>
    r.status === "fulfilled" ? r.value : { connected: false, error: r.reason instanceof Error ? r.reason.message : "Unknown error" };

  let production: { reachable: boolean; status?: number } = { reachable: false };
  try {
    const response = await fetch(PRINTSHOP_TARGET.productionUrl, { redirect: "follow", cache: "no-store" });
    production = { reachable: response.ok, status: response.status };
  } catch {}

  return NextResponse.json({
    target: PRINTSHOP_TARGET,
    github: safe(github),
    vercel: safe(vercel),
    supabase: safe(supabase),
    production,
    checkedAt: new Date().toISOString(),
  });
}