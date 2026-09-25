import { NextResponse } from "next/server";

const REQUIRED = [
  ["GitHub", "GITHUB_TOKEN"],
  ["Vercel", "VERCEL_TOKEN"],
  ["Vercel team", "VERCEL_TEAM_ID"],
  ["Vercel project", "VERCEL_PROJECT_ID"],
  ["Supabase URL", "SUPABASE_URL"],
  ["Supabase key", "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY"],
  ["AI provider key", "AI_API_KEY"],
  ["AI model", "AI_MODEL"],
] as const;

export async function GET() {
  const integrations = REQUIRED.map(([service, key]) => ({
    service,
    key,
    configured:
      key === "SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY"
        ? Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)
        : Boolean(process.env[key as keyof NodeJS.ProcessEnv]),
  }));

  return NextResponse.json({
    ok: true,
    configured: integrations.every((item) => item.configured),
    integrations,
    note: "Only configuration booleans are returned. Secret values are never exposed.",
  });
}
