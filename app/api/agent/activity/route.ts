import { NextResponse } from "next/server";
import { listEvents } from "@/lib/agent-event-bus.mjs";
import { listPersistedEvents } from "@/lib/agent-persistence-runtime.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Activity = {
  id: string;
  stage: string;
  status: "completed" | "blocked" | "pending";
  message: string;
};

function eventStatus(type: string): Activity["status"] {
  return type === "task.failed" ? "blocked" : type === "task.queued" ? "pending" : "completed";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") || undefined;
  const persisted = await listPersistedEvents(agentId);

  if (persisted.persisted) {
    const activities: Activity[] = persisted.events.slice(0, 20).map((event: any) => ({
      id: String(event.id),
      stage: String(event.type).split(".")[0] || "agent",
      status: eventStatus(String(event.type)),
      message: `${event.type} · agent=${event.agentId}${event.taskId ? ` · task=${event.taskId}` : ""}`,
    }));

    return NextResponse.json({
      ok: true,
      activities,
      source: "durable",
      productionWrites: false,
      constructorChanged: false,
    });
  }

  const runtimeEvents = listEvents(agentId);
  const runtimeActivities: Activity[] = runtimeEvents.slice(0, 20).map((event) => ({
    id: event.id,
    stage: event.type.split(".")[0] || "agent",
    status: eventStatus(event.type),
    message: `${event.type} · agent=${event.agentId}${event.taskId ? ` · task=${event.taskId}` : ""}`,
  }));

  const fallback: Activity[] = runtimeActivities.length ? runtimeActivities : [
    { id: "security", stage: "security", status: "completed", message: "Read-only security monitoring is available." },
    { id: "registry", stage: "agents", status: "completed", message: "Multi-agent registry API is available." },
    { id: "orchestrator", stage: "orchestration", status: "completed", message: "Safe orchestration pipeline is available." },
    { id: "production", stage: "production", status: "blocked", message: "Production writes remain gated by explicit approval." },
  ];

  return NextResponse.json({
    ok: true,
    activities: fallback,
    source: runtimeActivities.length ? "runtime" : "static-fallback",
    persistenceState: persisted.state,
    persistenceReason: persisted.reason,
    productionWrites: false,
    constructorChanged: false,
  });
}
