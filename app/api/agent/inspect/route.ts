import {NextResponse} from "next/server";
import {listProjectFiles, githubConfigured} from "../../../../lib/github";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const protectedAreas=["constructor","production database","auth","payments","orders"];

export async function POST(request:Request){
  const body=await request.json().catch(()=>({}));
  const task=typeof body.task==="string"?body.task.trim():"";
  if(!task)return NextResponse.json({ok:false,error:"task is required"},{status:400});
  if(!githubConfigured())return NextResponse.json({ok:true,mode:"read-only",task,candidates:[],protectedAreas,githubConfigured:false,note:"GitHub inspection is unavailable in this deployment because GITHUB_TOKEN is not configured."});
  try{
    const files=await listProjectFiles("main");
    const words=task.toLowerCase().split(/[^a-z0-9а-яё]+/i).filter((word:string)=>word.length>=3);
    const candidates=files.filter((path:string)=>{
      const p=path.toLowerCase();
      return !p.startsWith(".env")&&!p.includes("supabase/migrations")&&!p.includes("constructor")&&!p.startsWith(".git/")&&!p.includes("node_modules/");
    }).map((path:string)=>{
      const p=path.toLowerCase();
      const score=words.reduce((sum:number,word:string)=>sum+(p.includes(word)?2:0),0);
      return {path,score};
    }).filter((item:{path:string,score:number})=>item.score>0).sort((a:{path:string,score:number},b:{path:string,score:number})=>b.score-a.score||a.path.localeCompare(b.path)).slice(0,5);
    return NextResponse.json({ok:true,mode:"read-only",task,candidates,scannedFiles:files.length,protectedAreas,githubConfigured:true,note:"Candidate selection is read-only. No repository files were modified."});
  }catch(error){
    return NextResponse.json({ok:false,mode:"read-only",task,candidates:[],protectedAreas,githubConfigured:true,error:error instanceof Error?error.message:"Repository inspection failed"},{status:502});
  }
}
