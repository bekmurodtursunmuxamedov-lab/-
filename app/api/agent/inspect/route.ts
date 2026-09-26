import {NextResponse} from "next/server";
import {listProjectFiles} from "../../../../lib/github";

const EXTENSIONS=[".ts",".tsx",".js",".jsx",".mjs",".cjs"];
const BLOCKED=[".env","supabase/migrations","constructor"];

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(request:Request){
  try{
    const body=await request.json().catch(()=>({}));
    const task=String(body.task||"").trim();
    if(!task) return NextResponse.json({ok:false,error:"task is required"},{status:400});
    const terms=task.toLowerCase().split(/[^a-z0-9а-яё]+/).filter((x:string)=>x.length>2).slice(0,12);
    const paths=await listProjectFiles("main");
    const candidates=paths.filter((p:string)=>EXTENSIONS.some((ext:string)=>p.endsWith(ext))&&!BLOCKED.some((x:string)=>p.toLowerCase().includes(x)))
      .map((path:string)=>({path,score:terms.filter((t:string)=>path.toLowerCase().includes(t)).length}))
      .filter((item:{path:string;score:number})=>item.score>0)
      .sort((a:{path:string;score:number},b:{path:string;score:number})=>b.score-a.score||a.path.localeCompare(b.path))
      .slice(0,5);
    return NextResponse.json({ok:true,mode:"read-only",task,candidates,protectedAreas:["constructor","production database","auth","payments","orders"]});
  }catch(error){
    return NextResponse.json({ok:false,error:error instanceof Error?error.message:"inspection failed"},{status:500});
  }
}
