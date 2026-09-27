import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function blocked(path: string) {
  const value = path.toLowerCase();
  return value.includes("constructor") || value.includes("supabase/migrations") || value.includes(".env") || value.includes("auth") || value.includes("payment") || value.includes("order");
}

function relevance(path: string, task: string) {
  const words = task.toLowerCase().split(/[^a-z0-9а-яё]+/i).filter((word: string) => word.length >= 3);
  const value = path.toLowerCase();
  return words.filter((word: string) => value.includes(word)).length;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 5) : [];

  if (!task) {
    return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });
  }

  const candidates = files.map((file: unknown) => {
    const item = file as { path?: unknown; content?: unknown };
    const path = typeof item.path === "string" ? item.path : "";
    return {
      path,
      contentLength: typeof item.content === "string" ? item.content.length : 0,
      blocked: blocked(path),
      relevance: relevance(path, task),
    };
  });

  const safe = candidates.length > 0 && candidates.every((item: { path: string; blocked: boolean }) => item.path && !item.blocked);

  return NextResponse.json({
    ok: true,
    mode: "preview-only",
    task,
    diff: {
      status: safe ? "awaiting-generation" : "blocked",
      files: candidates,
      changes: [],
      message: safe ? "Files passed path safety review. No source changes were generated." : "A protected path was selected. No diff was generated.",
    },
    productionWrites: false,
    constructorChanged: false,
  });
}