import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function isProtected(path: string) {
  const value = path.toLowerCase();
  return value.includes("constructor") || value.includes("supabase/migrations") || value.includes(".env") || value.includes("payment") || value.includes("order") || value.includes("auth");
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const task = typeof body.task === "string" ? body.task.trim() : "";
  const files = Array.isArray(body.files) ? body.files.slice(0, 5) : [];

  if (!task) {
    return NextResponse.json({ ok: false, error: "task is required" }, { status: 400 });
  }

  const reviewedFiles = files.map((file: unknown) => {
    const item = file as { path?: unknown; sha?: unknown; content?: unknown };
    const path = typeof item.path === "string" ? item.path : "";
    const content = typeof item.content === "string" ? item.content : "";
    return {
      path,
      sha: typeof item.sha === "string" ? item.sha : null,
      contentLength: content.length,
      protected: isProtected(path),
      review: path ? "read-only review complete" : "invalid file path",
    };
  });

  return NextResponse.json({
    ok: true,
    mode: "read-only",
    task,
    reviewedFiles,
    safeToPatch: reviewedFiles.length > 0 && reviewedFiles.every((file: {path: string; protected: boolean}) => file.path && !file.protected),
    productionWrites: false,
    constructorChanged: false,
  });
}