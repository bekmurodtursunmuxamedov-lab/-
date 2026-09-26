import {NextResponse} from "next/server";
import {getProjectFile,listProjectFiles} from "../../../../lib/github";

const EXTENSIONS=[".ts",".tsx",".js",".jsx",".mjs",".cjs"];
const BLOCKED=[".env","supabase/migrations","constructor"];

function score(path:string,terms:string[]){
  const value=path.toLowerCase();
  return terms.reduce((n,t)=>n+(value.includes(t)?2:0),0);
}

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    const task=String(body.task||"").trim();
    if(!task) return NextResponse.json({ok:false,error:"task is required"},{status:400});
    const terms=task.toLowerCase().split(/[^a-z0-9а-яё]+/).filter(x=>x.length>2).slice(0,12);
    const paths=await listProjectFiles("main");
    const candidates=paths
      .filter(p=>EXTENSIONS.some(ext=>p.endsWith(ext))&&!BLOCKED.some(x=>p.toLowerCase().includes(x)))
      .map(path=>({path,score:score(path,terms)}))
      .sort((a,b)=>b.score-a.score||a.path.localeCompare(b.path))
      .slice(0,5);
    const files=[];
    for(const candidate of candidates){
      if(candidate.score<=0) continue;
      const file=await getProjectFile(candidate.path,"main");
      files.push({path:candidate.path,score:candidate.score,sha:file.sha,preview:file.content.slice(0,1200)});
    }
    return NextResponse.json({ok:true,mode:"read-only",task,candidates:files,protectedAreas:["constructor","production database","auth","payments","orders"]});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"inspection failed"},{status:500});
  }
}
