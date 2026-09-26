import {NextResponse} from "next/server";
import OpenAI from "openai";
import {createProjectBranch,createProjectPullRequest,inspectPrintshop,githubConfigured,getProjectFile,listProjectFiles,updateProjectFile} from "../../../lib/github";

const protectedWords=["production database","auth","payments","orders","delete users","delete products","drop table"];
const blockedPaths=[".env","package-lock.json","pnpm-lock.yaml","yarn.lock","bun.lock","supabase/migrations"];
const safePath=(path:string)=>Boolean(path)&&!path.startsWith("/")&&!path.includes("..")&&!path.includes("\\")&&!path.startsWith(".git/")&&!path.includes("node_modules/")&&!blockedPaths.some(x=>path===x||path.startsWith(x+"/"));
const parseJson=(text:string)=>JSON.parse(text.trim().replace(/^\\`\\`\\`(?:json)?\\s*/i,"").replace(/\\s*\\`\\`\\`$/,""));


async function buildInspection(){
  const base=await inspectPrintshop();
  const files=await listProjectFiles("main");
  const packageJson=await getProjectFile("package.json","main");
  return {
    ...base,
    files:files.slice(0,180),
    fileCount:files.length,
    packageJson:JSON.parse(packageJson.content)
  };
}

export async function POST(req:Request){
  try{
    const b=await req.json();
    const message=String(b.message||"").trim(),mode=String(b.mode||"Inspect");
    if(!message)return NextResponse.json({error:"Task message is required."},{status:400});
    if(mode==="Prepare" && b.confirmed!==true) return NextResponse.json({output:"Нужно явное подтверждение подготовки Draft PR. Main не изменён.",requiresConfirmation:true});
    if(mode==="Plan" && protectedWords.some(x=>message.toLowerCase().includes(x))) return NextResponse.json({output:"План затрагивает защищённую область. Изменения production DB/auth/payments/orders не выполняются автоматически."});
    if(["Fix","Improve","Deploy"].includes(mode)&&protectedWords.some(x=>message.toLowerCase().includes(x)))
      return NextResponse.json({output:"Задача затрагивает защищённую область. Нужна явная проверка и подтверждение перед изменением production."});
    let context="GitHub inspection unavailable.";
    if(githubConfigured()){
      try{context=JSON.stringify(await buildInspection());}
      catch(e){context=`GitHub inspection failed: ${e instanceof Error?e.message:"unknown error"}`;}
    }
    if(mode==="Offline"){
      const lower=message.toLowerCase();
      const protectedHit=protectedWords.filter(x=>lower.includes(x));
      const constructorRequested=/constructor|конструктор/i.test(message);
      const inspectionAvailable=!context.startsWith("GitHub inspection failed")&&context!=="GitHub inspection unavailable.";
      let candidates:string[]=[];
      if(inspectionAvailable){
        try{
          const parsed=JSON.parse(context);
          const all=Array.isArray(parsed.files)?parsed.files.map((x:any)=>typeof x==="string"?x:String(x.path||"")):[];
          const terms=lower.split(/[^a-zа-яё0-9]+/i).filter((x:string)=>x.length>2);
          const scored=all.filter((p:string)=>safePath(p)&&!/constructor|конструктор/i.test(p)).map((p:string)=>({p,score:terms.reduce((n:number,t:string)=>n+(p.toLowerCase().includes(t)?1:0),0)})).filter((x:any)=>x.score>0).sort((a:any,b:any)=>b.score-a.score||a.p.localeCompare(b.p));
          candidates=scored.slice(0,5).map((x:any)=>x.p);
        }catch{}
      }
      const lines=[
        "OFFLINE PLAN — без AI Gateway и без записи в production",
        "",
        `Задача: ${message}`,
        `GitHub inspection: ${inspectionAvailable?"получен":"недоступен"}`,
        `Кандидаты файлов: ${candidates.length?candidates.join(", "):"не определены автоматически"}`,
        "",
        "План:",
        "1. Использовать существующую структуру PRINTSHOP, не пересоздавая проект.",
        "2. Сузить изменение до минимального набора существующих файлов.",
        "3. Проверить запрещённые пути и чувствительные области перед любым изменением.",
        "4. Offline режим выполняет только dry-run: ничего не меняет и PR не создаёт.",
        "",
        `Защищённые области: ${protectedHit.length?protectedHit.join(", "):"не обнаружены в тексте задачи"}.`,
        `Конструктор: ${constructorRequested?"запрос обнаружен — изменение заблокировано без явного отдельного запроса.":"не затрагивается"}.`,
        "",
        "Следующий безопасный шаг: при необходимости использовать Prepare для Draft PR; main при Offline Plan не изменяется."
      ];
      return NextResponse.json({output:lines.join("\n"),mode:"Offline",inspection:true,candidates,productionWrites:false,constructorChanged:false,githubConfigured:githubConfigured()});
    }
    const key=process.env.AI_GATEWAY_API_KEY||process.env.AI_API_KEY;
    if(!key)return NextResponse.json({output:mode==="Inspect"?`PRINTSHOP inspected from GitHub.\\n\\n${context}`:"AI Gateway пока не подключён. Используй существующий AI_GATEWAY_API_KEY в Production."});
    const client=new OpenAI({apiKey:key,baseURL:"https://ai-gateway.vercel.sh/v1"});
    const model=process.env.AI_MODEL||"openai/gpt-5.5";
    if(mode==="Prepare"){
      const selectionText=await client.chat.completions.create({model,messages:[
        {role:"system",content:"You are a safe engineering manager. Select at most 2 EXISTING non-sensitive files from the supplied repository context that are relevant to the task. Never select .env, lockfiles, migrations, auth, payments, orders, or constructor files. Return JSON only: {\"files\":[\"path\"],\"summary\":\"...\"}."},
        {role:"user",content:`Task: ${message}\nRepository files/context: ${context}`}
      ]});
      const selection=parseJson(selectionText.choices[0]?.message?.content||"{}");
      const files=Array.isArray(selection.files)?selection.files.map(String).slice(0,2):[];
      if(!files.length||files.some((p:string)=>!safePath(p)||/constructor|конструктор/i.test(p))) return NextResponse.json({output:"Не удалось безопасно выбрать файлы. Main не изменён.",requiresConfirmation:false});
      const existing=[]; for(const p of files){existing.push(await getProjectFile(p,"main"));}
      const draftText=await client.chat.completions.create({model,messages:[
        {role:"system",content:"Create a minimal safe code change for the task. Modify ONLY the supplied files. Do not change secrets, lockfiles, migrations, auth, payments, orders, or constructor. Return JSON only: {\"title\":\"...\",\"body\":\"...\",\"files\":[{\"path\":\"...\",\"content\":\"full file content\"}]}."},
        {role:"user",content:`Task: ${message}\nSelected files:\n${JSON.stringify(existing)}`}
      ]});
      const draft=parseJson(draftText.choices[0]?.message?.content||"{}");
      if(!Array.isArray(draft.files)||draft.files.length<1||draft.files.length>2) return NextResponse.json({output:"AI не создал безопасный набор изменений. Main не изменён."});
      for(const ch of draft.files){if(!ch||typeof ch.path!=="string"||typeof ch.content!=="string"||!files.includes(ch.path)||!safePath(ch.path)||/constructor|конструктор/i.test(ch.path)) return NextResponse.json({output:"Изменение заблокировано проверкой безопасности. Main не изменён."});}
      const branch=`agent/task-${Date.now().toString(36)}`; await createProjectBranch(branch,"main");
      const changed:string[]=[]; for(const ch of draft.files){const original=existing.find((x:any)=>x.path===ch.path); if(original&&original.content!==ch.content){await updateProjectFile(ch.path,ch.content,`agent: ${String(draft.title||message).slice(0,72)}`,branch); changed.push(ch.path);}}
      if(!changed.length) return NextResponse.json({output:"Изменений не создано: содержимое файлов не изменилось. Main не изменён."});
      const pr=await createProjectPullRequest(String(draft.title||"Agent Hub prepared change"),String(draft.body||"Prepared by Agent Hub. Review before merge."),branch,"main");
      return NextResponse.json({output:`Draft PR #${pr.number} подготовлен.\\nИзменённые файлы: ${changed.join(", ")}\\nMain не изменён.`,pullRequest:{number:pr.number,url:pr.html_url,branch},model,githubConfigured:true});
    }
    try{
      const r=await client.chat.completions.create({
        model,
        messages:[
          {role:"system",content:"Ты безопасный AI engineering manager для существующего PRINTSHOP. Не пересоздавай проект. Не трогай конструктор PRINTSHOP без явного запроса. Не меняй production database, auth, payments или orders без явного подтверждения. Сначала инспектируй GitHub. Для Inspect дай краткий фактологический отчёт. Для Fix/Improve дай план: цель, затронутые файлы, риски, проверки. Не утверждай, что что-то изменено, если изменения ещё не выполнены."},
          {role:"user",content:`Режим: ${mode}\nЗадача: ${message}\nGitHub inspection: ${context}`}
        ]
      });
      return NextResponse.json({output:r.choices[0]?.message?.content||"AI не вернул текст.",model,githubConfigured:true,inspection:true});
    }catch(e){
      const detail=e instanceof Error?e.message:"AI Gateway request failed.";
      const blocked=/credit card|valid credit card|403|billing|unlock your free credits/i.test(detail);
      return NextResponse.json({
        output:blocked
          ?"AI Gateway сейчас заблокирован Vercel из-за требования платёжной карты. Ничего не изменено. Переключись на Offline — он работает без AI Gateway и без оплаты."
          :`AI Gateway недоступен: ${detail}. Ничего не изменено. Можно использовать Offline режим.`,
        mode,
        fallback:"Offline",
        productionWrites:false,
        constructorChanged:false,
        githubConfigured:githubConfigured()
      });
    }
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Agent task failed."},{status:500})}
}