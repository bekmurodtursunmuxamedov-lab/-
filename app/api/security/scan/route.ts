import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  return NextResponse.json({
    ok:true,
    mode:"read-only",
    scannedFiles:0,
    findings:[],
    note:"Scanner bootstrap is active; source inspection is disabled in this build-safe step."
  });
}
