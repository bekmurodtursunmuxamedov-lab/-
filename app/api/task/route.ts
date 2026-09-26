import {NextResponse} from "next/server";
import OpenAI from "openai";
import {applyProjectChanges,createProjectBranch,createProjectPullRequest,getProjectFile,inspectPrintshop,githubConfigured,listProjectFiles} from "../../../lib/github";

const protectedWords=["production database","auth","payments","orders","delete users","delete products","drop table"];
const protectedPath=/^(\.env|.*\/\.env|.*(auth|payment|checkout|order|orders|supabase|migration|constructor).*)/i;

function blocked(message:string,paths:string[]=[]){
  const m=message.toLowerCase();
  if(protectedWords.some(x=>m.includes(x))) return "Задача затрагивает защищённую область. Нужна явная проверка и подтверждение перед изменением production.";
  if(paths.some(p=>protectedPath.test(p)) && !m.includes("explicitly authorize protected") && !m.includes("подтверждаю защищённую область")) return "Запрошены защищённые файлы. Для безопасности агент не изменяет auth/payments/orders/production DB/constructor без явного запроса.";
  return null;
}
function jsonFrom(text:string){
  const cleaned=text.replace(/^\s*```json\s*/,"").replace(/\s*```\s*$/,"").trim();
  return JSON.parse(cleaned);
}
async function ai(model:string,key:string,messages:any[]){
  const client=new OpenAI({apiKey:key,baseURL:"https://ai-gateway.vercel.sh/v1"});
  const r=await client.chat.completions.create({model,messages});
  return r.choices[0]?.message?.content||"{}";
}
export async function POST(req:Request){
  try{
    const b=await req.json();
    const message=String(b.message||"").trim();
    const mode=String(b.mode||"Inspect");
    if(!message) return NextResponse.json({error:"Task message is required."},{status:400});
    const key=process.env.AI_GATEWAY_API_KEY||process.env.AI_API_KEY;
    if(!key) return NextResponse.json({output:"AI Gateway пока не подключён. Используй существующий AI_GATEWAY_API_KEY в Production."});
    const model=process.env.AI_MODEL||"openai/gpt-5.5";
    let context="GitHub inspection unavailable.";
    if(githubConfigured()){
      try{context=JSON.stringify(await inspectPrintshop());}catch(e){context=`GitHub inspection failed: ${e instanceof Error?e.message:"unknown error"}`;}
    }

    if(mode==="Inspect"){
      const out=await ai(model,key,[{role:"system",content:"Ты безопасный AI engineering manager существующего PRINTSHOP. Не пересоздавай проект. Конструктор PRINTSHOP не трогать без явного запроса. Production DB/auth/payments/orders не менять без явного подтверждения. Верни JSON {summary,findings,nextSteps}."},{role:"user",content:`Задача: ${message}\nGitHub context: ${context}`}]);
      return NextResponse.json({output:out,model,githubConfigured:githubConfigured(),source:githubConfigured()?"github":"ai"});
    }

    if(mode==="Deploy"){
      return NextResponse.json({output:"Deploy режим подготовлен как безопасный режим проверки. Автоматический production deploy не выполняется. Сначала Inspect/Fix/Improve → Draft PR → проверка CI."});
    }

    if(!githubConfigured()) return NextResponse.json({output:"Для Fix/Improve нужен GITHUB_TOKEN в Production Agent Hub. Токен не нужно отправлять в чат."});
    const files=await listProjectFiles("main");
    const planText=await ai(model,key,[
      {role:"system",content:"Ты планировщик изменений для существующего PRINTSHOP. Выбирай только реально существующие файлы из списка. Максимум 8 файлов. Никогда не выбирай .env, secrets, auth, payments, orders, migrations, Supabase production files или constructor. Верни только JSON {summary,files:[paths],tests,prTitle,prBody}. Не меняй файлы пока не получишь их содержимое."},
      {role:"user",content:`Режим: ${mode}\nЗадача: ${message}\nФайлы PRINTSHOP:\n${files.slice(0,700).join("\n")}`}
    ]);
    const plan=jsonFrom(planText);
    const selected=Array.isArray(plan.files)?plan.files.slice(0,8):[];
    const security=blocked(message,selected);
    if(security) return NextResponse.json({output:security,plan});
    if(!selected.length) return NextResponse.json({output:"AI не выбрал безопасные файлы для изменения.",plan});

    const inspected=[];
    for(const path of selected) inspected.push(await getProjectFile(path,"main"));
    const changeText=await ai(model,key,[
      {role:"system",content:"Ты инженер PRINTSHOP. Изменяй только предоставленные и уже инспектированные файлы. Сохраняй существующую архитектуру. Не трогай конструктор без явного запроса. Не добавляй секреты. Верни только JSON {summary,files:[{path,content}],tests}. content должен быть полным новым содержимым каждого файла. Максимум 8 файлов."},
      {role:"user",content:`Задача: ${message}\nРежим: ${mode}\nИнспектированные файлы:\n${inspected.map(x=>`--- ${x.path} ---\n${x.content}`).join("\n")}`}
    ]);
    const changes=jsonFrom(changeText);
    if(!Array.isArray(changes.files)||changes.files.length<1||changes.files.length>8) return NextResponse.json({output:"AI вернул некорректный набор изменений.",plan});
    const paths=changes.files.map((x:any)=>String(x.path||""));
    const pathSet=new Set(selected);
    if(paths.some(p=>!pathSet.has(p))) return NextResponse.json({output:"Безопасность: AI попытался изменить файл, который не был предварительно инспектирован.",plan});
    const security2=blocked(message,paths);
    if(security2) return NextResponse.json({output:security2,plan});
    if(changes.files.some((x:any)=>typeof x.content!=="string")) return NextResponse.json({output:"Некорректное содержимое файла от AI.",plan});

    const suffix=Date.now().toString(36);
    const branch=`agent/${mode.toLowerCase()}-${suffix}`;
    await createProjectBranch(branch,"main");
    const applied=await applyProjectChanges(branch,changes.files.map((x:any)=>({path:x.path,content:x.content})),`agent: ${String(plan.summary||message).slice(0,120)}`);
    const pr=await createProjectPullRequest(String(plan.prTitle||`Agent: ${mode} PRINTSHOP`),String(plan.prBody||"Automated safe draft PR from Agent Hub."),branch,"main");
    return NextResponse.json({output:"Готово: изменения записаны в отдельную ветку и создан Draft PR. Production не изменён.",branch,commitSha:applied.commitSha,files:applied.files,pr:{number:pr.number,url:pr.html_url,draft:pr.draft},tests:changes.tests||plan.tests||[]});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Agent task failed."},{status:500});}
}