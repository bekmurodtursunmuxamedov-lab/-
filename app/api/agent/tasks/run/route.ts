import { NextResponse } from "next/server";
import { runTask } from "@/lib/agent-task-runner";
import { restoreTask } from "@/lib/agent-task-queue";
import { listPersistedTasks } from "@/lib/agent-persistence-runtime.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const taskId = typeof body.taskId === "string" ? body.taskId.trim() : "";
  if (!taskId) return NextResponse.json({ ok: false, error: "taskId is required" }, { status: 400 });

  const persisted = await listPersistedTasks();
  const storedTask = persisted.persisted
    ? persisted.tasks.find((task: any) => task?.id === taskId)
    : null;

  if (storedTask) {
    restoreTask(storedTask);
  }

  const result = runTask(taskId);
  if (!result) {
    return NextResponse.json({
      ok: false,
      error: "task not found",
      persisted: persisted.persisted,
      persistenceState: persisted.state,
      productionWrites: false,
    }, { status: 404 });
  }

  return NextResponse.json({
    ...result,
    persisted: persisted.persisted,
    persistenceState: persisted.state,
    productionWrites: false,
  }, { status: result.ok ? 200 : 409 });
}
