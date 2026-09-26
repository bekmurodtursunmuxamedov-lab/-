import {NextResponse} from "next/server";
import {getProjectFile,listProjectFiles} from "../../../../lib/github";

const EXTENSIONS=[".ts",".tsx",".js",".jsx",".mjs",".cjs"];
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const paths=await listProjectFiles("main");
    const files=paths.filter((path)=>EXTENSIONS.some((ext)=>path.endsWith(ext))&&!path.includes(".env")&&!path.includes("supabase/migrations/")).slice(0,30);
    const findings=[];
    for(const path of files){
      const file=await getProjectFile(path,"main");
      const lines=file.content.split("\n");
      for(let index=0;index<lines.length;index++){
        const line=lines[index].toLowerCase();
        if(line.includes("eval(")||line.includes("new function(")||line.includes("dangerouslysetinnerhtml")){
          findings.push({path,line:index+1,message:"Review potentially dangerous dynamic or raw HTML operation."});
        }
      }
    }
    return NextResponse.json({ok:true,mode:"read-only",scannedFiles:files.length,findings});
  }catch(error){
    return NextResponse.json({ok:false,mode:"read-only",error:error instanceof Error?error.message:"security scan failed"},{status:500});
  }
}
