import {NextResponse} from "next/server";
import {getProjectFile} from "@/lib/github";

const STATE_PATH = "data/agent-state.json";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const state = await getProjectFile(STATE_PATH, "main");
    return NextResponse.json({
      ok: true,
      persistent: true,
      source: "github",
      sha: state.sha,
      state: JSON.parse(state.content),
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        persistent: false,
        error: error instanceof Error ? error.message : "agent state unavailable",
      },
      { status: 500 },
    );
  }
}
