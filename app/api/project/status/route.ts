import { NextResponse } from "next/server";

const target = {
  repository: "bekmurodtursunmuxamedov-lab/print-style-uz",
  supabaseProject: "hedcbhmyohofmoqworgy",
  productionUrl: "https://print-style-uz.vercel.app",
  protectedAreas: ["production database", "auth", "payments", "orders"],
};

export async function GET() {
  let production = { reachable: false, status: 0 as number };
  try {
    const response = await fetch(target.productionUrl, { cache: "no-store", redirect: "follow" });
    production = { reachable: response.ok, status: response.status };
  } catch {}

  return NextResponse.json({
    success: true,
    target,
    github: {
      connected: Boolean(process.env.GITHUB_TOKEN),
      configured: Boolean(process.env.GITHUB_TOKEN),
    },
    vercel: {
      connected: Boolean(process.env.VERCEL_TOKEN),
      configured: Boolean(process.env.VERCEL_TOKEN),
      projectConfigured: Boolean(process.env.VERCEL_PROJECT_ID),
      teamConfigured: Boolean(process.env.VERCEL_TEAM_ID),
    },
    supabase: {
      connected: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
      configured: Boolean(process.env.SUPABASE_URL && (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY)),
    },
    ai: {
      configured: Boolean(process.env.AI_GATEWAY_API_KEY || process.env.AI_API_KEY),
      model: process.env.AI_MODEL || "openai/gpt-5.5",
    },
    production,
    checkedAt: new Date().toISOString(),
  });
}