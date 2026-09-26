import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const blockedWords = ["constructor", "supabase/migrations", ".env", "auth", "payment", "order"];

function blocked(path: string) {
  const value = path.toLowerCase();
  return blockedWords.some((word) => value.includes(word));
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 2) : [];

  if (!task) return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });

  const selected = files.map((file: unknown) => {
    const item = file as { path?: unknown; sha?: unknown; content?: unknown };
    const path = typeof item.path === "string" ? item.path : "";
    const content = typeof item.content === "string" ? item.content : "";
    return {
      path,
      sha: typeof item.sha === "string" ? item.sha : null,
      contentLength: content.length,
      blocked: blocked(path),
    };
  });

  const safe = selected.length > 0 && selected.every((item: { path: string; blocked: boolean }) => item.path && !item.blocked);

  return NextResponse.json({
    ok: true,
    mode: "patch-plan",
    task,
    plan: {
      status: safe ? "ready-for-minimal-patch" : "blocked",
      files: selected,
      maxFiles: 2,
      operations: safe ? ["read-current-version", "generate-minimal-change", "recheck-protected-paths", "validate-before-write"] : [],
      message: safe
        ? "Patch planning is ready. Actual source writing remains disabled in this stage."
        : "Patch planning stopped because no safe editable file set was provided.",
    },
    productionWrites: false,
    constructorChanged: false,
  });
}