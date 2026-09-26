import {NextResponse} from "next/server";
import {getProjectFile} from "@/lib/github";

type Task={id:string;agentId:string;targetId:string;title:string;type:"incident";priority:"urgent"|"normal";status:"detected"|"queued"|"analyzing";fingerprint:string;createdAt:string;updatedAt:string};

const STATE_PATH="data/agent-state.json";
const MAX_TASKS=100;

function fingerprint(input:string){return input.toLowerCase().replace(/\s+/g," ").trim().slice(0,180)}

export async function GET(){
  try{
    const state=await getProjectFile(STATE_PATH,"main");
    const parsed=JSON.parse(state.content);
    const tasks=(parsed.tasks||[]) as Task[];
    return NextResponse.json({ok:true,count:tasks.length,queued:tasks.filter(t=>t.status==="queued").length,analyzing:tasks.filter(t=>t.status==="analyzing").length,tasks});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"task queue unavailable"},{status:500});
  }
}

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    if(body.action!=="enqueue") return NextResponse.json({ok:false,error:"Only enqueue is supported by this read-only queue API."},{status:400});
    const incident=body.incident;
    if(!incident?.summary||!incident?.targetId) return NextResponse.json({ok:false,error:"incident.summary and incident.targetId are required"},{status:400});
    const state=await getProjectFile(STATE_PATH,"main");
    const parsed=JSON.parse(state.content);
    const tasks=(parsed.tasks||[]) as Task[];
    const fp=fingerprint(`${incident.targetId}:${incident.kind||"incident"}:${incident.summary}`);
    const existing=tasks.find(t=>t.fingerprint===fp&&["detected","queued","analyzing"].includes(t.status));
    if(existing) return NextResponse.json({ok:true,deduplicated:true,task:existing});
    const now=new Date().toISOString();
    const task:Task={
      id:`task_${Date.now()}`,agentId:incident.agentId||"printshop-engineer",targetId:incident.targetId,
      title:incident.summary,type:"incident",priority:incident.severity==="high"?"urgent":"normal",
      status:"queued",fingerprint:fp,createdAt:now,updatedAt:now
    };
    parsed.tasks=[task,...tasks].slice(0,MAX_TASKS);
    parsed.updatedAt=now;
    return NextResponse.json({ok:true,persisted:false,preview:true,task,reason:"State is currently read-only; persistence requires an approved writer path."});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"queue error"},{status:500});
  }
}
