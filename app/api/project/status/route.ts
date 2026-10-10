import { NextResponse } from "next/server";
import { getGitHubStatus } from "../../../../lib/github";
import { getVercelStatus } from "../../../../lib/vercel";
import { getSupabaseStatus } from "../../../../lib/supabase-health";

export const dynamic = "force-dynamic";

export async function GET() {
  const [github, vercel, supabase] = await Promise.allSettled([
    getGitHubStatus(),
    getVercelStatus(),
    getSupabaseStatus(),
  ]);

  const safe = (result: PromiseSettledResult<unknown>) =>
    result.status === "fulfilled"
      ? result.value
      : {
          connected: false,
          error:
            result.reason instanceof Error
              ? result.reason.message
              : "Unknown error",
        };

  // Deliberately do not ping the PRINTSHOP production URL from this diagnostic route.
  return NextResponse.json({
    github: safe(github),
    vercel: safe(vercel),
    supabase: safe(supabase),
    checkedAt: new Date().toISOString(),
  });
}
