import {NextResponse} from "next/server";

const TARGETS=[
  {id:"printshop",name:"PRINTSHOP",url:"https://print-style-uz.vercel.app"}
];

export async function GET(){
  const started=Date.now();
  const results=await Promise.all(TARGETS.map(async target=>{
    const t=Date.now();
    try{
      const r=await fetch(target.url,{method:"GET",redirect:"follow",cache:"no-store",signal:AbortSignal.timeout(8000)});
      return {id:target.id,name:target.name,url:target.url,ok:r.ok,status:r.status,latencyMs:Date.now()-t};
    }catch(e){
      return {id:target.id,name:target.name,url:target.url,ok:false,status:0,latencyMs:Date.now()-t,error:e instanceof Error?e.message:"health check failed"};
    }
  }));
  const failed=results.filter(x=>!x.ok).length;
  return NextResponse.json({ok:failed===0,checkedAt:new Date().toISOString(),durationMs:Date.now()-started,targets:results});
}
