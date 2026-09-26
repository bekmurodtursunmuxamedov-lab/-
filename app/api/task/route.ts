import {NextResponse} from "next/server";
import OpenAI from "openai";
import {inspectPrintshop,githubConfigured,getProjectFile,listProjectFiles} from "../../../lib/github";

const protectedWords=["production database","auth","payments","orders","delete users","delete products","drop table"];

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
    if(["Fix","Improve","Deploy"].includes(mode)&&protectedWords.some(x=>message.toLowerCase().includes(x)))
      return NextResponse.json({output:"Задача затрагивает защищённую область. Нужна явная проверка и подтверждение перед изменением production."});
    let context="GitHub inspection unavailable.";
    if(githubConfigured()){
      try{context=JSON.stringify(await buildInspection());}
      catch(e){context=`GitHub inspection failed: ${e instanceof Error?e.message:"unknown error"}`;}
    }
    const key=process.env.AI_GATEWAY_API_KEY||process.env.AI_API_KEY;
    if(!key)return NextResponse.json({output:mode==="Inspect"?`PRINTSHOP inspected from GitHub.\\n\\n${context}`:"AI Gateway пока не подключён. Используй существующий AI_GATEWAY_API_KEY в Production."});
    const client=new OpenAI({apiKey:key,baseURL:"https://ai-gateway.vercel.sh/v1"});
    const model=process.env.AI_MODEL||"openai/gpt-5.5";
    const r=await client.chat.completions.create({
      model,
      messages:[
        {role:"system",content:"Ты безопасный AI engineering manager для существующего PRINTSHOP. Не пересоздавай проект. Не трогай конструктор PRINTSHOP без явного запроса. Не меняй production database, auth, payments или orders без явного подтверждения. Сначала инспектируй GitHub. Для Inspect дай краткий фактологический отчёт. Для Fix/Improve дай план: цель, затронутые файлы, риски, проверки. Не утверждай, что что-то изменено, если изменения ещё не выполнены."},
        {role:"user",content:`Режим: ${mode}\nЗадача: ${message}\nGitHub inspection: ${context}`}
      ]
    });
    return NextResponse.json({output:r.choices[0]?.message?.content||"AI не вернул текст.",model,githubConfigured:true,inspection:true});
  }catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Agent task failed."},{status:500})}
}