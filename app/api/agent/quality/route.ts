import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const checks = Array.isArray(body.checks) ? body.checks.slice(0, 10) : [];

  const normalized = checks.map((check: unknown) => {
    const item = check as { name?: unknown; passed?: unknown; detail?: unknown };
    return {
      name: typeof item.name === "string" ? item.name : "unnamed",
      passed: item.passed === true,
      detail: typeof item.detail === "string" ? item.detail : "",
    };
  });

  const failed = normalized.filter((check: { passed: boolean }) => !check.passed);

  return NextResponse.json({
    ok: true,
    mode: "quality-gate",
    checks: normalized,
    passed: normalized.length > 0 && failed.length === 0,
    failed: failed.map((check: { name: string }) => check.name),
    nextAction: failed.length ? "stop-and-analyze" : "eligible-for-draft-pr",
    productionWrites: false,
    constructorChanged: false,
  });
}