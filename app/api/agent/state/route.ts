import {NextResponse} from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    persistent: false,
    source: "offline-bootstrap",
    state: { version: 1, agents: {}, tasks: [] },
  });
}
