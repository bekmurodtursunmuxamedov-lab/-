import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agent-registry-store";
import { enqueueTask } from "@/lib/agent-task-queue";
import { runTask } from "@/lib/agent-task-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const agentId = typeof body.agentId === "string" ? body.agentId.trim() : "printshop-engineer";
  const observation = typeof body.observation === "string" ? body.observation.trim() : "";
  const source = typeof body.source === "string" ? body.source.trim() : "scheduler";

  const agent = getAgent(agentId);
  if (!agent) return NextResponse.json({ ok: false, error: "agent not found" }, { status: 404 });
  if (agent.status !== "active") {
    return NextResponse.json({ ok: false, scheduled: false, reason: "agent-not-active", productionWrites: false }, { status: 409 });
  }

  if (!observation) {
    return NextResponse.json({
      ok: true,
      scheduled: false,
      reason: "no-observation",
      nextAction: "continue-monitoring",
      productionWrites: false,
    });
  }

  const task = enqueueTask(agentId, observation);
  const result = runTask(task.id);

  return NextResponse.json({
    ok: Boolean(result?.ok),
    scheduled: true,
    source,
    task: result?.task ?? task,
    stages: result?.stages ?? [],
    nextAction: result?.nextAction ?? "task-queued",
    persistence: "runtime-only",
    productionWrites: false,
  }, { status: result?.ok ? 200 : 409 });
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    scheduler: {
      enabled: true,
      intervalMinutes: 15,
      mode: "safe-dispatch",
      automaticProductionWrites: false,
      persistence: "runtime-only",
    },
  });
}
