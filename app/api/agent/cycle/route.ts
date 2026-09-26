import { NextResponse } from "next/server";
import { getAgent } from "@/lib/agent-registry-store";
import { enqueueTask } from "@/lib/agent-task-queue";
import { runTask } from "@/lib/agent-task-runner";

type Incident = {
  id: string;
  agentId: string;
  targetId: string;
  kind: "availability" | "latency";
  severity: "high" | "medium";
  status: "detected";
  summary: string;
  detectedAt: string;
};

const targets = [{ id: "printshop", name: "PRINTSHOP", url: "https://print-style-uz.vercel.app" }];

export async function GET() {
  const checkedAt = new Date().toISOString();
  const incidents: Incident[] = [];

  const results = await Promise.all(targets.map(async (target) => {
    const started = Date.now();
    try {
      const response = await fetch(target.url, {
        redirect: "follow",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      const latencyMs = Date.now() - started;

      if (!response.ok) {
        incidents.push({
          id: `inc_${Date.now()}_${target.id}`,
          agentId: "printshop-engineer",
          targetId: target.id,
          kind: "availability",
          severity: "high",
          status: "detected",
          summary: `${target.name} returned HTTP ${response.status}`,
          detectedAt: checkedAt,
        });
      } else if (latencyMs >= 5000) {
        incidents.push({
          id: `inc_${Date.now()}_${target.id}`,
          agentId: "printshop-engineer",
          targetId: target.id,
          kind: "latency",
          severity: "medium",
          status: "detected",
          summary: `${target.name} responded slowly (${latencyMs}ms)`,
          detectedAt: checkedAt,
        });
      }

      return { id: target.id, name: target.name, url: target.url, ok: response.ok, status: response.status, latencyMs };
    } catch (error) {
      incidents.push({
        id: `inc_${Date.now()}_${target.id}`,
        agentId: "printshop-engineer",
        targetId: target.id,
        kind: "availability",
        severity: "high",
        status: "detected",
        summary: `${target.name} health check failed`,
        detectedAt: checkedAt,
      });
      return {
        id: target.id,
        name: target.name,
        url: target.url,
        ok: false,
        status: 0,
        latencyMs: Date.now() - started,
        error: error instanceof Error ? error.message : "health check failed",
      };
    }
  }));

  const agent = getAgent("printshop-engineer");
  const dispatchedTasks = incidents.map((incident) => {
    if (!agent || agent.status !== "active") {
      return { incidentId: incident.id, status: "not-dispatched", reason: "agent-not-active" };
    }
    const task = enqueueTask(incident.agentId, incident.summary);
    const result = runTask(task.id);
    return {
      incidentId: incident.id,
      status: result?.task.status ?? "failed",
      taskId: result?.task.id ?? task.id,
      nextAction: result?.nextAction ?? "task-queued",
      stages: result?.stages ?? [],
    };
  });

  return NextResponse.json({
    ok: incidents.length === 0,
    cycle: { id: `cycle_${Date.now()}`, agentId: "printshop-engineer", checkedAt },
    targets: results,
    tasks: dispatchedTasks,
    incidents,
    persistence: "runtime-only",
    productionWrites: false,
    constructorChanged: false,
  });
}