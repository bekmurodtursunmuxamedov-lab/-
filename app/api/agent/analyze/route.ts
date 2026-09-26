import {NextResponse} from "next/server";

type Incident={targetId?:string;kind?:string;severity?:string;summary?:string;details?:string};

function buildAnalysis(incident:Incident){
  const summary=incident.summary||"Unspecified incident";
  const severity=incident.severity||"normal";
  const kind=incident.kind||"incident";
  const target=incident.targetId||"unknown";
  return {
    ok:true,
    mode:"read-only",
    analysis:{
      targetId:target,
      kind,
      severity,
      summary,
      diagnosis:"Incident requires repository/runtime inspection before any code change.",
      evidence:incident.details||"No additional evidence supplied.",
      recommendedAction:"Inspect the affected target and prepare a minimal change plan.",
      protectedAreas:["constructor","production database","auth","payments","orders"],
      productionWrites:false,
      constructorChanged:false
    }
  };
}

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    if(!body.incident||typeof body.incident!=="object"){
      return NextResponse.json({ok:false,error:"incident object is required"},{status:400});
    }
    return NextResponse.json(buildAnalysis(body.incident as Incident));
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"analysis failed"},{status:500});
  }
}
