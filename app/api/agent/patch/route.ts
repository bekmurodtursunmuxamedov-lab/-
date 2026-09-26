import {NextResponse} from "next/server";

type Plan={targetId?:string;title?:string;steps?:string[]};

const BLOCKED=["constructor","supabase/migrations",".env","auth","payment","order"];

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    const plan=body.plan as Plan|undefined;
    if(!plan||typeof plan!=="object") return NextResponse.json({ok:false,error:"plan object is required"},{status:400});
    const target=plan.targetId||"unknown";
    const proposedFiles:string[]=[];
    const blockedAreas=BLOCKED.filter((item)=>JSON.stringify(plan).toLowerCase().includes(item));
    return NextResponse.json({
      ok:true,
      mode:"dry-run",
      targetId:target,
      patch:{
        status:"preview-only",
        proposedFiles,
        changes:[],
        blocked:blockedAreas.length>0,
        blockedAreas,
        message:"No files were modified. A concrete file patch requires repository inspection and explicit safe-path selection."
      },
      productionWrites:false,
      constructorChanged:false
    });
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"patch preview failed"},{status:500});
  }
}
