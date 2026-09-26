import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blockedWords = ["constructor", "supabase/migrations", ".env", "auth", "payment", "order"];

function isBlocked(path: string) {
  const value = path.toLowerCase();
  return blockedWords.some((word) => value.includes(word));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 2) : [];

  if (!task) {
    return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });
  }

  const reviewed = files.map((file: unknown) => {
    const item = file as { path?: unknown; content?: unknown };
    const path = typeof item.path === "string" ? item.path : "";
    return {
      path,
      contentLength: typeof item.content === "string" ? item.content.length : 0,
      blocked: isBlocked(path),
    };
  });

  const safe = reviewed.length > 0 && reviewed.every((item: { path: string; blocked: boolean }) => item.path && !item.blocked);

  return NextResponse.json({
    ok: true,
    mode: "proposal-only",
    task,
    proposal: {
      status: safe ? "ready-for-generation" : "blocked",
      files: reviewed,
      changes: [],
      message: safe
        ? "Files passed safety review. Code generation is intentionally separated from this proposal stage."
        : "Protected file path detected. Generation is blocked.",
    },
    productionWrites: false,
    constructorChanged: false,
  });
}