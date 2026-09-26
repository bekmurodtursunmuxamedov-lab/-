import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const task=typeof body.task==="string"?body.task.trim():"";
  if(!task) return NextResponse.json({ok:false,error:"task is required"},{status:400});
  return NextResponse.json({
    ok:true,
    mode:"read-only",
    task,
    candidates:[],
    protectedAreas:["constructor","production database","auth","payments","orders"],
    note:"Repository candidate selection is staged for the next build-safe step."
  });
}
