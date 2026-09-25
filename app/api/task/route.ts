import { NextResponse } from "next/server";
import { PRINTSHOP_RULES } from "../../../lib/policy";
import { getGitHubStatus, listProjectFiles, getProjectFile, createProjectBranch, updateProjectFile, createProjectPullRequest } from "../../../lib/github";
import { getVercelStatus } from "../../../lib/vercel";
import { getSupabaseStatus } from "../../../lib/supabase-health";
import { PRINTSHOP_TARGET } from "../../../lib/integration-spec";

type Finding = { severity:"info"|"warning"|"critical"; area:string; title:string; detail:string };
type ProposedFile = { path:string; content:string; reason?:string };
type AiPlan = { summary:string; files:string[]; tests?:string[] };
type AiChange = { summary:string; files:ProposedFile[]; tests?:string[]; risk:"low"|"medium"|"high" };

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
  const [github,vercel,supabase]=await Promise.allSettled([getGitHubStatus(),getVercelStatus(),getSupabaseStatus()]);
  let production:{reachable:boolean;status?:number;error?:string}={reachable:false};
  try{
    const response=await fetch(PRINTSHOP_TARGET.productionUrl,{redirect:"follow",cache:"no-store"});
    production={reachable:response.ok,status:response.status};
  }catch(error){production={reachable:false,error:error instanceof Error?error.message:"Production check failed"}}
  const g=safeResult(github),v=safeResult(vercel),s=safeResult(supabase);
  const latestCommit=g.latestCommit?.sha, deployedCommit=v.latestDeployment?.commitSha;
  return {
    github:{connected:g.connected===true,branch:g.defaultBranch,latestCommit:g.latestCommit?{sha:g.latestCommit.sha,message:g.latestCommit.message,date:g.latestCommit.date}:null,openPullRequests:g.openPullRequests?.length??0},
    vercel:{connected:v.connected===true,latestDeployment:v.latestDeployment?{state:v.latestDeployment.state,url:v.latestDeployment.url,commitSha:v.latestDeployment.commitSha,message:v.latestDeployment.commitMessage}:null},
    supabase:{connected:s.connected===true,httpStatus:s.httpStatus},
    production,deploymentBehindGitHub:Boolean(latestCommit&&deployedCommit&&latestCommit!==deployedCommit),
    aiConfigured:Boolean(process.env.AI_API_KEY),checkedAt:new Date().toISOString()
  };
}

function buildFindings(inspection:any):Finding[]{
  if(inspection.error)return[{severity:"critical",area:"Agent",title:"Инспекция не завершена",detail:inspection.error}];
  const f:Finding[]=[];
  if(!inspection.github.connected)f.push({severity:"critical",area:"GitHub",title:"GitHub не подключён",detail:"Агент не сможет читать и изменять исходный код."});
  else f.push({severity:"info",area:"GitHub",title:"Исходный код доступен",detail:`Ветка ${inspection.github.branch||"—"}, commit ${inspection.github.latestCommit?.sha?.slice(0,7)||"—"}.`});
  if(!inspection.vercel.connected)f.push({severity:"warning",area:"Vercel",title:"Vercel не подключён",detail:"Агент не сможет подтвердить deployment через API."});
  else if(inspection.vercel.latestDeployment?.state!=="READY")f.push({severity:"warning",area:"Vercel",title:"Последний deployment не READY",detail:inspection.vercel.latestDeployment?.state||"Нет deployment"});
  else f.push({severity:"info",area:"Vercel",title:"Deployment готов",detail:`Последний deployment: ${inspection.vercel.latestDeployment?.commitSha?.slice(0,7)||"—"}.`});
  if(!inspection.supabase.connected)f.push({severity:"warning",area:"Supabase",title:"Supabase health check не подтверждён",detail:`HTTP ${inspection.supabase.httpStatus??"—"}.`});
  else f.push({severity:"info",area:"Supabase",title:"Supabase отвечает",detail:`Read-only health check: HTTP ${inspection.supabase.httpStatus}.`});
  if(!inspection.production.reachable)f.push({severity:"critical",area:"Production",title:"Production недоступен",detail:inspection.production.error||"Нет успешного HTTP-ответа."});
  else f.push({severity:"info",area:"Production",title:"Production отвечает",detail:`HTTP ${inspection.production.status}.`});
  if(inspection.deploymentBehindGitHub)f.push({severity:"warning",area:"Sync",title:"Vercel отстаёт от GitHub",detail:"Последний commit GitHub отличается от deployment."});
  if(inspection.github.openPullRequests>0)f.push({severity:"info",area:"GitHub",title:"Есть открытые PR",detail:`Открыто PR: ${inspection.github.openPullRequests}.`});
  if(!inspection.aiConfigured)f.push({severity:"warning",area:"AI",title:"AI provider не подключён",detail:"Fix/Improve требуют AI_API_KEY."});
  if(!f.some(x=>x.severity==="critical"||x.severity==="warning"))f.push({severity:"info",area:"System",title:"Критических проблем не найдено",detail:"Можно переходить к конкретной задаче."});
  return f;
}

function jsonFromAi(text:string){
  const cleaned=text.trim().replace(/^\`\`\`json\s*/,"").replace(/^\`\`\`\s*/,"").replace(/\s*\`\`\`$/,"");
  return JSON.parse(cleaned);
}

async function aiJson(system:string,user:string){
  const key=process.env.AI_API_KEY;
  if(!key)throw new Error("AI_API_KEY is not configured");
  const base=(process.env.AI_BASE_URL||"https://api.openai.com/v1").replace(/\/$/,"");
  const model=process.env.AI_MODEL||"gpt-4o-mini";
  const response=await fetch(base+"/chat/completions",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+key},body:JSON.stringify({model,messages:[{role:"system",content:system},{role:"user",content:user}],temperature:0.1})});
  if(!response.ok)throw new Error(`AI provider ${response.status}: ${await response.text().catch(()=>"")}`);
  const data=await response.json();
  const content=data.choices?.[0]?.message?.content;
  if(typeof content!=="string")throw new Error("AI provider returned no text");
  return jsonFromAi(content);
}

function validatePath(path:string){
  if(!path||path.startsWith("/")||path.includes("..")||path.includes("\\")||path.startsWith(".env")||/secret|credential|password|token/i.test(path))return false;
  return /\.(tsx?|jsx?|css|json|md|html)$/.test(path);
}

function validateChange(change:AiChange){
  if(!change||!Array.isArray(change.files)||change.files.length===0)throw new Error("AI returned no files to change");
  if(change.files.length>8)throw new Error("AI proposed too many files in one task");
  for(const file of change.files){
    if(!validatePath(file.path))throw new Error(`Unsafe file path proposed: ${file.path}`);
    if(typeof file.content!=="string"||file.content.length>500000)throw new Error(`Invalid content for ${file.path}`);
    if(/(?:ghp_|github_pat_|sk-[A-Za-z0-9]|SUPABASE_SERVICE_ROLE_KEY|VERCEL_TOKEN|AI_API_KEY)/i.test(file.content))throw new Error(`Possible secret detected in ${file.path}`);
  }
  if(change.risk==="high")throw new Error("AI classified this change as high risk; human review is required");
}

async function executeChange(message:string, mode:string, inspection:any){
  if(!process.env.AI_API_KEY)throw new Error("AI_API_KEY is not configured. Connect the AI provider in Vercel before Fix/Improve.");
  if(!inspection.github.connected)throw new Error("GitHub is not connected. Fix/Improve requires GITHUB_TOKEN.");
  const branch=inspection.github.branch||"main";
  const files=await listProjectFiles(branch);
  const plan=await aiJson(
    "You are the planning stage of a safe software engineering agent. Return ONLY JSON: {"summary":string,"files":string[],"tests":string[]}. Choose at most 8 existing source files from the supplied repository file list. Never choose secrets, .env files, generated build files, node_modules, or production infrastructure unless the user explicitly requested it. Constructor code is editable.",
    `User request: ${message}\nMode: ${mode}\nRepository files:\n${files.join("\n")}`
  ) as AiPlan;
  const selected=Array.isArray(plan.files)?plan.files.filter((p)=>files.includes(p)).slice(0,8):[];
  if(!selected.length)throw new Error("AI could not identify safe existing source files for this task");
  const source=await Promise.all(selected.map((path)=>getProjectFile(path,branch)));
  const change=await aiJson(
    "You are the implementation stage of a safe software engineering agent. Return ONLY JSON: {"summary":string,"files":[{"path":string,"content":string,"reason":string}],"tests":string[],"risk":"low|medium|high"}. Return complete replacement contents for only the supplied files. Preserve unrelated behavior. Do not add secrets. Do not delete data. Do not modify production database schemas, auth, payments, orders, or deployment secrets. Constructor is allowed. Keep changes minimal.",
    `User request: ${message}\nPlan: ${JSON.stringify(plan)}\nCurrent files:\n${source.map(x=>"--- "+x.path+" ---\n"+x.content).join("\n")}`
  ) as AiChange;
  validateChange(change);
  const sourceMap=new Map(source.map(x=>[x.path,x.content]));
  for(const f of change.files)if(!sourceMap.has(f.path))throw new Error(`AI attempted to modify a file it did not inspect: ${f.path}`);
  const branchName=`agent/${Date.now()}-${mode.toLowerCase()}`;
  await createProjectBranch(branchName,branch);
  const commits:string[]=[];
  for(const f of change.files){
    const result=await updateProjectFile(f.path,f.content,`agent: ${mode.toLowerCase()} ${f.path}`,branchName);
    if(result.commitSha)commits.push(result.commitSha);
  }
  const pr=await createProjectPullRequest(
    `agent: ${mode} — ${change.summary.slice(0,70)}`,
    `AI agent proposal for PRINTSHOP.\\n\\nRequest: ${message}\\n\\nSummary: ${change.summary}\\nRisk: ${change.risk}\\nTests: ${(change.tests||[]).join("; ")||"Not specified"}\\n\\nThis PR is intentionally created as draft for validation/review before merge or deploy.`,
    branchName,
    branch
  );
  return {summary:change.summary,risk:change.risk,tests:change.tests||[],branch:branchName,commits,pr:{number:pr.number,url:pr.html_url||pr.url,title:pr.title}};
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
    if(x.area==="AI")return "Подключить AI_API_KEY, AI_BASE_URL и AI_MODEL в Vercel.";
    if(x.area==="GitHub")return "Подключить GITHUB_TOKEN с доступом к PRINTSHOP.";
    if(x.area==="Vercel")return "Подключить VERCEL_TOKEN и проверить project/team ID.";
    if(x.area==="Supabase")return "Проверить SUPABASE_URL и read-only ключ.";
    if(x.area==="Production")return "Проверить доступность production до внесения изменений.";
    if(x.area==="Sync")return "Сверить commit GitHub и deployment перед изменением.";
    return "Проверить проблему повторной инспекцией.";
  });
  if(mode!=="Inspect" && confirmation){
    return NextResponse.json({task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status:"awaiting_confirmation",message,stages:["received","inspecting","planning","awaiting_confirmation"]},inspection,findings,recommendedActions,reply:"Задача требует подтверждения, потому что затрагивает защищённую production-зону. Код пока не изменён."});
  }
  if(mode==="Inspect"){
    return NextResponse.json({task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status:"inspected",message,stages:["received","inspecting","completed"]},inspection,findings,recommendedActions,reply:"Инспекция завершена. Код и production не изменялись."});
  }
  if(mode==="Deploy"){
    return NextResponse.json({task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status:"awaiting_confirmation",message,stages:["received","inspecting","awaiting_confirmation"]},inspection,findings,recommendedActions,reply:"Deploy требует отдельного подтверждения после проверки PR. Сначала агент должен создать и проверить изменение."});
  }
  try{
    const execution=await executeChange(message,mode,inspection);
    return NextResponse.json({task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status:"pr_created",message,stages:["received","inspecting","planning","changing","pr_created"]},inspection,findings,recommendedActions,execution,reply:`Изменение подготовлено в ветке ${execution.branch}. Создан draft PR #${execution.pr.number}. Production не изменялся.`});
  }catch(error){
    return NextResponse.json({task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status:"blocked",message,stages:["received","inspecting","planning","blocked"]},inspection,findings,recommendedActions,error:error instanceof Error?error.message:"Execution failed",reply:"Изменение остановлено безопасно. "+(error instanceof Error?error.message:"Execution failed")},{status:200});
  }
}
