import { NextResponse } from "next/server";
import { listEvents } from "@/lib/agent-event-bus.mjs";
import { listPersistedEvents } from "@/lib/agent-persistence-runtime.mjs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const agentId = url.searchParams.get("agentId") || undefined;
  const type = url.searchParams.get("type") || undefined;
  const persisted = await listPersistedEvents(agentId, type);

  if (persisted.persisted) {
    return NextResponse.json({
      ok: true,
      events: persisted.events,
      count: persisted.events.length,
      persisted: true,
      persistenceState: persisted.state,
      productionWrites: false,
    });
  }

  const events = listEvents(agentId, type);
  return NextResponse.json({
    ok: true,
    events,
    count: events.length,
    persisted: false,
    persistenceState: persisted.state,
    persistenceReason: persisted.reason,
    productionWrites: false,
  });
}
