import { NextResponse } from "next/server";
import { getSupabaseStatus } from "@/lib/supabase";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const status = await getSupabaseStatus();
    return NextResponse.json({ ok: true, configured: true, ...status });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Supabase adapter failed";
    const configured = Boolean(
      process.env.SUPABASE_PUBLISHABLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.SUPABASE_SECRET_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    return NextResponse.json({
      ok: false,
      configured,
      connected: false,
      dataApi: false,
      readOnly: true,
      error: message,
      projectRef: process.env.SUPABASE_URL?.match(/^https:\/\/([^.]+)\.supabase\.co/)?.[1] || "hedcbhmyohofmoqworgy",
    }, { status: configured ? 502 : 200 });
  }
}
