import {NextResponse} from "next/server";
import {listProjectFiles, githubConfigured} from "../../../../lib/github";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const task=typeof body.task==="string"?body.task.trim():"";
  if(!task) return NextResponse.json({ok:false,error:"task is required"},{status:400});

  if(!githubConfigured()){
    return NextResponse.json({
      ok:true,
      mode:"read-only",
      task,
      candidates:[],
      protectedAreas:["constructor","production database","auth","payments","orders"],
      githubConfigured:false,
      note:"GitHub inspection is unavailable in this deployment because GITHUB_TOKEN is not configured."
    });
  }

  try{
    const files=await listProjectFiles("main");
    return NextResponse.json({
      ok:true,
      mode:"read-only",
      task,
      candidates:[],
      scannedFiles:files.length,
      protectedAreas:["constructor","production database","auth","payments","orders"],
      githubConfigured:true,
      note:"Repository file listing is connected. Candidate scoring is the next inspection step."
    });
  }catch(error){
    return NextResponse.json({
      ok:false,
      mode:"read-only",
      task,
      candidates:[],
      protectedAreas:["constructor","production database","auth","payments","orders"],
      githubConfigured:true,
      error:error instanceof Error?error.message:"Repository inspection failed"
    },{status:502});
  }
}
