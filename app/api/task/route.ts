import { NextResponse } from "next/server";
import { PRINTSHOP_RULES } from "../../../lib/policy";
import { getGitHubStatus } from "../../../lib/github";
import { getVercelStatus } from "../../../lib/vercel";
import { getSupabaseStatus } from "../../../lib/supabase-health";
import { PRINTSHOP_TARGET } from "../../../lib/integration-spec";

type Finding = { severity:"info"|"warning"|"critical"; area:string; title:string; detail:string };

const confirmationWords = [...PRINTSHOP_RULES.requireConfirmation];

function needsConfirmation(message:string, mode:string){
  const value=message.toLowerCase();
  return mode==="Deploy" || confirmationWords.some(word=>value.includes(word.toLowerCase())) ||
    /production|database|auth|payment|order|delete|drop|secret|token|key/.test(value);
}

function safeResult(r:PromiseSettledResult<any>){
  return r.status==="fulfilled"?r.value:{connected:false,error:r.reason instanceof Error?r.reason.message:"Unknown error"};
}

async function inspectProject(){
  const [github,vercel,supabase]=await Promise.allSettled([
    getGitHubStatus(),getVercelStatus(),getSupabaseStatus()
  ]);
  let production:{reachable:boolean;status?:number;error?:string}={reachable:false};
  try{
    const response=await fetch(PRINTSHOP_TARGET.productionUrl,{redirect:"follow",cache:"no-store"});
    production={reachable:response.ok,status:response.status};
  }catch(error){
    production={reachable:false,error:error instanceof Error?error.message:"Production check failed"};
  }
  const g=safeResult(github),v=safeResult(vercel),s=safeResult(supabase);
  const latestCommit=g.latestCommit?.sha;
  const deployedCommit=v.latestDeployment?.commitSha;
  return {
    github:{connected:g.connected===true,branch:g.defaultBranch,latestCommit:g.latestCommit?{sha:g.latestCommit.sha,message:g.latestCommit.message,date:g.latestCommit.date}:null,openPullRequests:g.openPullRequests?.length??0},
    vercel:{connected:v.connected===true,latestDeployment:v.latestDeployment?{state:v.latestDeployment.state,url:v.latestDeployment.url,commitSha:v.latestDeployment.commitSha,message:v.latestDeployment.commitMessage}:null},
    supabase:{connected:s.connected===true,httpStatus:s.httpStatus},
    production,
    deploymentBehindGitHub:Boolean(latestCommit&&deployedCommit&&latestCommit!==deployedCommit),
    aiConfigured:Boolean(process.env.AI_API_KEY),
    checkedAt:new Date().toISOString()
  };
}

function buildFindings(inspection:any):Finding[]{
  if(inspection.error) return [{severity:"critical",area:"Agent",title:"Инспекция не завершена",detail:inspection.error}];
  const f:Finding[]=[];
  if(!inspection.github.connected) f.push({severity:"critical",area:"GitHub",title:"GitHub не подключён",detail:"Агент не сможет читать и изменять исходный код."});
  else f.push({severity:"info",area:"GitHub",title:"Исходный код доступен",detail:`Ветка ${inspection.github.branch||"—"}, commit ${inspection.github.latestCommit?.sha?.slice(0,7)||"—"}.`});
  if(!inspection.vercel.connected) f.push({severity:"warning",area:"Vercel",title:"Vercel не подключён",detail:"Агент не сможет подтвердить deployment через API."});
  else if(inspection.vercel.latestDeployment?.state!=="READY") f.push({severity:"warning",area:"Vercel",title:"Последний deployment не READY",detail:inspection.vercel.latestDeployment?.state||"Нет deployment"});
  else f.push({severity:"info",area:"Vercel",title:"Deployment готов",detail:`Последний deployment: ${inspection.vercel.latestDeployment?.commitSha?.slice(0,7)||"—"}.`});
  if(!inspection.supabase.connected) f.push({severity:"warning",area:"Supabase",title:"Supabase health check не подтверждён",detail:`HTTP ${inspection.supabase.httpStatus??"—"}.`});
  else f.push({severity:"info",area:"Supabase",title:"Supabase отвечает",detail:`Read-only health check: HTTP ${inspection.supabase.httpStatus}.`});
  if(!inspection.production.reachable) f.push({severity:"critical",area:"Production",title:"Production недоступен",detail:inspection.production.error||"Нет успешного HTTP-ответа."});
  else f.push({severity:"info",area:"Production",title:"Production отвечает",detail:`HTTP ${inspection.production.status}.`});
  if(inspection.deploymentBehindGitHub) f.push({severity:"warning",area:"Sync",title:"Vercel отстаёт от GitHub",detail:"Последний commit GitHub отличается от deployment."});
  if(inspection.github.openPullRequests>0) f.push({severity:"info",area:"GitHub",title:"Есть открытые PR",detail:`Открыто PR: ${inspection.github.openPullRequests}.`});
  if(!inspection.aiConfigured) f.push({severity:"warning",area:"AI",title:"AI provider не подключён",detail:"Inspect работает без AI, но Fix/Improve требуют AI_API_KEY."});
  if(!f.some(x=>x.severity==="critical"||x.severity==="warning")) f.push({severity:"info",area:"System",title:"Критических проблем не найдено",detail:"Можно переходить к конкретной задаче."});
  return f;
}

export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const message=typeof body.message==="string"?body.message.trim():"";
  const mode=typeof body.mode==="string"?body.mode:"Inspect";
  if(!message)return NextResponse.json({error:"message is required"},{status:400});
  const confirmation=needsConfirmation(message,mode);
  const inspection:any=await inspectProject().catch(error=>({error:error instanceof Error?error.message:"Inspection failed"}));
  const findings=buildFindings(inspection);
  const recommendedActions=findings.filter(x=>x.severity!=="info").map(x=>{
    if(x.area==="AI") return "Подключить AI_API_KEY, AI_BASE_URL и AI_MODEL в Vercel.";
    if(x.area==="GitHub") return "Подключить GITHUB_TOKEN с доступом к PRINTSHOP.";
    if(x.area==="Vercel") return "Подключить VERCEL_TOKEN и проверить project/team ID.";
    if(x.area==="Supabase") return "Проверить SUPABASE_URL и read-only ключ.";
    if(x.area==="Production") return "Проверить доступность production до внесения изменений.";
    if(x.area==="Sync") return "Сверить commit GitHub и deployment Vercel перед изменением.";
    return "Проверить проблему повторной инспекцией.";
  });
  const plan=[
    "1. Инспекция GitHub, Vercel, Supabase и production.",
    "2. Разбор найденных проблем.",
    mode==="Inspect"?"3. Только диагностика — исходный код не изменяется.":confirmation?"3. Подготовка изменения с остановкой перед защищёнными production-действиями.":"3. Подготовка минимального изменения.",
    "4. После изменения — build, deployment и runtime validation."
  ];
  const status=confirmation?"awaiting_confirmation":mode==="Inspect"?"inspected":"planned";
  const summary=inspection.error?"Проверка завершилась с ошибкой: "+inspection.error:"GitHub: "+(inspection.github.connected?"подключён":"недоступен")+"; Vercel: "+(inspection.vercel.connected?"подключён":"недоступен")+"; Supabase: "+(inspection.supabase.connected?"доступен":"недоступен")+"; Production: "+(inspection.production.reachable?"доступен":"недоступен")+"; AI: "+(inspection.aiConfigured?"подключён":"не подключён")+".";
  return NextResponse.json({
    task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status,message,stages:["received","inspecting","planning",...(confirmation?["awaiting_confirmation"]:["ready_for_execution"])]},
    inspection,findings,recommendedActions,
    reply:(confirmation?"Задача принята. Перед защищённым действием потребуется подтверждение.\n\n":"Задача принята.\n\n")+summary+"\n\n"+plan.join("\n")
  });
}
