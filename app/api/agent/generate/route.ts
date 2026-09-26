import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blockedWords = ["constructor", "supabase/migrations", ".env", "auth", "payment", "order"];

function isBlocked(path: string) {
  const value = path.toLowerCase();
  return blockedWords.some((word) => value.includes(word));
}

function hasUnsafeContent(content: string) {
  const value = content.toLowerCase();
  return value.includes("process.env.") || value.includes("service_role") || value.includes("private key");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 2) : [];

  if (!task) return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });

  const reviewed = files.map((file: unknown) => {
    const item = file as { path?: unknown; content?: unknown };
    const path = typeof item.path === "string" ? item.path : "";
    const content = typeof item.content === "string" ? item.content : "";
    return {
      path,
      contentLength: content.length,
      blocked: isBlocked(path),
      sensitiveContent: hasUnsafeContent(content),
    };
  });

  const safe = reviewed.length > 0 && reviewed.every((item: { path: string; blocked: boolean; sensitiveContent: boolean }) =>
    item.path && !item.blocked && !item.sensitiveContent
  );

  return NextResponse.json({
    ok: true,
    mode: "proposal-only",
    task,
    proposal: {
      status: safe ? "ready-for-generation" : "blocked",
      files: reviewed,
      changes: [],
      message: safe
        ? "Files passed path and sensitive-content checks. No code was generated or written."
        : "Safety review blocked generation for at least one selected file.",
    },
    productionWrites: false,
    constructorChanged: false,
  });
}