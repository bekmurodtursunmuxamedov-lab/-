import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Activity = {
  id: string;
  stage: string;
  status: "completed" | "blocked" | "pending";
  message: string;
};

export async function GET() {
  const activities: Activity[] = [
    { id: "security", stage: "security", status: "completed", message: "Read-only security monitoring is available." },
    { id: "registry", stage: "agents", status: "completed", message: "Multi-agent registry API is available." },
    { id: "orchestrator", stage: "orchestration", status: "completed", message: "Safe orchestration pipeline is available." },
    { id: "production", stage: "production", status: "blocked", message: "Production writes remain gated by explicit approval." },
  ];

  return NextResponse.json({
    ok: true,
    activities,
    productionWrites: false,
    constructorChanged: false,
  });
}
