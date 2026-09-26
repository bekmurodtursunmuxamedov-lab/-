import { NextResponse } from "next/server";

type FileInput = { path?: unknown; content?: unknown; sha?: unknown };

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blocked = ["constructor", ".env", "supabase/migrations", "production database", "auth", "payments", "orders"];

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 5) as FileInput[] : [];

  if (!task) {
    return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });
  }

  const reviewed = files.map((file) => {
    const path = typeof file.path === "string" ? file.path : "";
    const content = typeof file.content === "string" ? file.content : "";
    const lower = path.toLowerCase();
    const blockedAreas = blocked.filter((item) => lower.includes(item));
    return {
      path,
      sha: typeof file.sha === "string" ? file.sha : null,
      relevant: task.toLowerCase().split(/[^a-z0-9а-яё]+/i).filter((word) => word.length >= 3).some((word) => lower.includes(word)),
      contentLength: content.length,
      blocked: blockedAreas.length > 0,
      blockedAreas,
    };
  });

  return NextResponse.json({
    ok: true,
    mode: "read-only",
    task,
    reviewed,
    productionWrites: false,
    constructorChanged: false,
    note: "Review only. No repository files were modified.",
  });
}
