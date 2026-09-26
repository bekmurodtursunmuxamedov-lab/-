import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 5) : [];

  if (!task) {
    return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });
  }

  return NextResponse.json({
    ok: true,
    mode: "read-only",
    task,
    reviewedFiles: files.map((file: unknown) => {
      const item = file as { path?: unknown; sha?: unknown; content?: unknown };
      return {
        path: typeof item.path === "string" ? item.path : "",
        sha: typeof item.sha === "string" ? item.sha : null,
        contentLength: typeof item.content === "string" ? item.content.length : 0,
      };
    }),
    productionWrites: false,
    constructorChanged: false,
  });
}
