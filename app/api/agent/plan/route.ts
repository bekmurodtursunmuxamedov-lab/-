import {NextResponse} from "next/server";

type Analysis={targetId?:string;kind?:string;severity?:string;summary?:string;diagnosis?:string;recommendedAction?:string};

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    const analysis=body.analysis as Analysis|undefined;
    if(!analysis||typeof analysis!=="object"){
      return NextResponse.json({ok:false,error:"analysis object is required"},{status:400});
    }
    const target=analysis.targetId||"unknown";
    return NextResponse.json({
      ok:true,
      mode:"read-only",
      plan:{
        targetId:target,
        title:"Safe inspection and repair plan",
        steps:[
          "Inspect the target repository and deployment evidence.",
          "Identify the smallest affected file or configuration.",
          "Prepare a minimal patch without protected areas.",
          "Run build and relevant checks on a preview branch.",
          "Stop and request approval before production changes."
        ],
        protectedAreas:["constructor","production database","auth","payments","orders"],
        productionWrites:false,
        constructorChanged:false
      }
    });
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"plan generation failed"},{status:500});
  }
}
