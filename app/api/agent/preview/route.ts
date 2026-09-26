import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function safeDeploymentUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const url = typeof body.url === "string" ? body.url.trim() : "";

  if (!url) return NextResponse.json({ ok: false, error: "preview url is required" }, { status: 400 });
  if (!safeDeploymentUrl(url)) return NextResponse.json({ ok: false, error: "only HTTPS Vercel preview URLs are allowed" }, { status: 400 });

  try {
    const started = Date.now();
    const response = await fetch(url, { method: "GET", redirect: "follow", cache: "no-store" });
    const text = await response.text().catch(() => "");
    const elapsedMs = Date.now() - started;

    return NextResponse.json({
      ok: true,
      mode: "preview-verification",
      url,
      status: response.status,
      healthy: response.ok,
      latencyMs: elapsedMs,
      hasHtml: text.includes("<html") || text.includes("<!DOCTYPE"),
      productionWrites: false,
      message: response.ok ? "Vercel Preview responded successfully." : "Vercel Preview returned a non-success status.",
    });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      mode: "preview-verification",
      url,
      healthy: false,
      productionWrites: false,
      error: error instanceof Error ? error.message : "Preview verification failed",
    });
  }
}