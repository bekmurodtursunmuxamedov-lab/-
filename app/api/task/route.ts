import {NextResponse} from "next/server";
import OpenAI from "openai";
import {createProjectBranch,createProjectPullRequest,inspectPrintshop,githubConfigured,getProjectFile,listProjectFiles,updateProjectFile} from "../../../lib/github";

const protectedWords=["production database","auth","payments","orders","delete users","delete products","drop table"];\nconst blockedPaths=[".env","package-lock.json","pnpm-lock.yaml","yarn.lock","bun.lock","supabase/migrations"];\nconst constructorPattern=/(constructor|конструктор)/i;

function safePath(path:string){return Boolean(path)&&!path.startsWith("/")&&!path.includes("..")&&!path.includes("\\")&&!path.startsWith(".git/")&&!path.includes("node_modules/")&&!blockedPaths.some(x=>path===x||path.startsWith(x+"/"));}\nfunction parseJson(text:string){const cleaned=text.trim().replace(/^```(?:json)?\\s*/i,"").replace(/\\s*```$/,"");return JSON.parse(cleaned);}\nasync function ask(client:OpenAI,model:string,messages:any[]){const r=await client.chat.completions.create({model,messages});return r.choices[0]?.message?.content||"";}\n\nasync function buildInspection(){
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
    const key=process.env.AI_GATEWAY_API_KEY||process.env.AI_API_KEY;
    if(!key)return NextResponse.json({output:mode==="Inspect"?`PRINTSHOP inspected from GitHub.\\n\\n${context}`:"AI Gateway пока не подключён. Используй существующий AI_GATEWAY_API_KEY в Production."});
    const client=new OpenAI({apiKey:key,baseURL:"https://ai-gateway.vercel.sh/v1"});
    const model=process.env.AI_MODEL||"openai/gpt-5.5";
    if(mode==="Prepare"){
      const planRaw=await ask(client,model,[
        {role:"system",content:"Выбери только существующие исходные файлы PRINTSHOP. Верни только JSON: {\\"files\\":[\\"path\\"],\\"summary\\":\\"...\\"}. Максимум 3 файла. Нельзя .env, lock-файлы, supabase/migrations, auth, payments, orders или constructor/конструктор файлы."},
        {role:"user",content:`Задача: ${message}\\nДоступные файлы: ${context}`}
      ]);
      let plan:any; try{plan=parseJson(planRaw);}catch{return NextResponse.json({output:"AI вернул некорректный план файлов. Изменения не выполнены.",inspection:true});}
      const files=Array.isArray(plan.files)?plan.files.map((x:any)=>String(x)).slice(0,3):[];
      if(!files.length)return NextResponse.json({output:"Безопасных файлов для изменения не найдено. Main не изменён.",inspection:true});
      if(files.some((p:string)=>!safePath(p)||constructorPattern.test(p)))return NextResponse.json({output:"План содержит запрещённый путь или затрагивает конструктор. Изменения не выполнены.",inspection:true});
      const available=new Set(await listProjectFiles("main"));
      if(files.some((p:string)=>!available.has(p)))return NextResponse.json({output:"AI выбрал файл, которого нет в текущем main. Изменения не выполнены.",inspection:true});
      const source:any[]=[]; for(const path of files)source.push(await getProjectFile(path,"main"));
      const patchRaw=await ask(client,model,[
        {role:"system",content:"Подготовь изменения для существующего PRINTSHOP. Верни только JSON: {\\"files\\":[{\\"path\\":\\"...\\",\\"content\\":\\"полное новое содержимое файла\\"}],\\"title\\":\\"...\\",\\"body\\":\\"...\\"}. Используй только переданные файлы. Не добавляй секреты. Не меняй auth/payments/orders/production DB. Не меняй constructor."},
        {role:"user",content:`Задача: ${message}\\n${source.map(x=>`PATH: ${x.path}\\nCONTENT:\\n${x.content}`).join("\\n\\n")}`}
      ]);
      let patch:any; try{patch=parseJson(patchRaw);}catch{return NextResponse.json({output:"AI вернул некорректный набор изменений. Ничего не записано.",inspection:true});}
      const changes=Array.isArray(patch.files)?patch.files:[];
      if(changes.length<1||changes.length>3)return NextResponse.json({output:"Набор изменений не прошёл проверку. Ничего не записано.",inspection:true});
      if(changes.some((x:any)=>!x||!safePath(String(x.path))||constructorPattern.test(String(x.path))||!files.includes(String(x.path))||typeof x.content!=="string"))return NextResponse.json({output:"Набор изменений не прошёл проверку безопасности. Ничего не записано.",inspection:true});
      const branch=`agent/task-${Date.now().toString(36)}`;
      await createProjectBranch(branch,"main");
      const committed:string[]=[];
      for(const change of changes){
        const path=String(change.path); const original=source.find(x=>x.path===path);
        if(!original)throw new Error(`Missing inspected source: ${path}`);
        if(original.content===change.content)continue;
        await updateProjectFile(path,change.content,`agent: prepare ${path}`,branch);
        committed.push(path);
      }
      if(!committed.length)return NextResponse.json({output:"Изменений не требуется после проверки. Main не изменён.",branch});
      const pr=await createProjectPullRequest(String(patch.title||`Agent: ${message.slice(0,70)}`),String(patch.body||`Prepared by PRINTSHOP Agent Hub. Task: ${message}`),branch,"main");
      return NextResponse.json({output:`Draft PR #${pr.number} подготовлен. Main не изменён.\\nВетка: ${branch}\\nИзменены файлы: ${committed.join(", ")}`,branch,prNumber:pr.number,prUrl:pr.html_url||pr.url,files:committed,model,inspection:true});
    }

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