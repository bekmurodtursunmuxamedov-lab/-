import { NextResponse } from "next/server";
import { PRINTSHOP_RULES } from "../../../lib/policy";
import { getGitHubStatus } from "../../../lib/github";
import { getVercelStatus } from "../../../lib/vercel";
import { getSupabaseStatus } from "../../../lib/supabase-health";
import { PRINTSHOP_TARGET } from "../../../lib/integration-spec";

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
    checkedAt:new Date().toISOString()
  };
}
export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const message=typeof body.message==="string"?body.message.trim():"";
  const mode=typeof body.mode==="string"?body.mode:"Inspect";
  if(!message)return NextResponse.json({error:"message is required"},{status:400});
  const confirmation=needsConfirmation(message,mode);
  const inspection:any=await inspectProject().catch(error=>({error:error instanceof Error?error.message:"Inspection failed"}));
  const plan=[
    "1. Проверил текущее состояние PRINTSHOP через GitHub, Vercel, Supabase и production.",
    "2. Анализирую запрос без блокировки конструктора.",
    confirmation?"3. Подготовлю изменение и остановлюсь перед production-зонами, требующими подтверждения.":"3. Подготовлю минимальное безопасное изменение.",
    "4. После изменения проверю build, deployment и runtime."
  ];
  const status=confirmation?"awaiting_confirmation":"planned";
  const summary=inspection.error?"Проверка завершилась с ошибкой: "+inspection.error:"GitHub: "+(inspection.github.connected?"подключён":"недоступен")+"; Vercel: "+(inspection.vercel.connected?"подключён":"недоступен")+"; Supabase: "+(inspection.supabase.connected?"доступен":"недоступен")+"; Production: "+(inspection.production.reachable?"доступен":"недоступен")+"; Deployment behind GitHub: "+(inspection.deploymentBehindGitHub?"да":"нет")+".";
  return NextResponse.json({
    task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status,message,stages:["received","inspecting","planning",...(confirmation?["awaiting_confirmation"]:["ready_for_execution"])]},
    inspection,
    reply:(confirmation?"Задача принята. Реальная проверка выполнена. Перед изменением production-зон потребуется подтверждение.\n\n":"Задача принята. Реальная проверка проекта выполнена.\n\n")+summary+"\n\n"+plan.join("\n")
  });
}
