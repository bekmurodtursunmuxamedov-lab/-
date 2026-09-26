import {NextResponse} from "next/server";
import {getProjectFile, listProjectFiles} from "@/lib/github";

const SOURCE=/\.(ts|tsx|js|jsx|mjs|cjs)$/i;
const MAX_FILES=30;

const rules=[
  {id:"eval",severity:"high",pattern:/\beval\s*\(/,message:"Dynamic eval detected; review for code injection risk."},
  {id:"new-function",severity:"high",pattern:/\bnew\s+Function\s*\(/,message:"Dynamic Function constructor detected."},
  {id:"child-process",severity:"high",pattern:/\b(?:child_process|exec\s*\(|execSync\s*\(|spawn\s*\()/,message:"Server-side process execution API detected; verify input handling."},
  {id:"dangerous-html",severity:"medium",pattern:/dangerouslySetInnerHTML/,message:"Raw HTML injection surface detected; verify sanitization and trusted input."},
  {id:"hardcoded-secret",severity:"high",pattern:/(?:api[_-]?key|secret|token|password)\s*[:=]\s*["'][^"']{12,}["']/i,message:"Possible hardcoded credential detected."}
];

export async function GET(){
  try{
    const all=await listProjectFiles("main");
    const files=all.filter(p=>SOURCE.test(p)&&!p.includes(".env")&&!p.includes("supabase/migrations/")).slice(0,MAX_FILES);
    const findings:any[]=[];
    for(const path of files){
      const file=await getProjectFile(path,"main");
      for(const rule of rules){
        if(rule.pattern.test(file.content)){
          findings.push({id:`${rule.id}:${path}`,rule:rule.id,severity:rule.severity,path,message:rule.message});
        }
      }
    }
    const counts={high:findings.filter(x=>x.severity==="high").length,medium:findings.filter(x=>x.severity==="medium").length};
    return NextResponse.json({
      ok:counts.high===0,
      mode:"read-only",
      scannedFiles:files.length,
      truncated:all.filter(p=>SOURCE.test(p)).length>MAX_FILES,
      findings,
      summary:counts,
      nextStep:findings.length?"Review findings before any fix. No production files were changed.":"No heuristic findings in the scanned files."
    });
  }catch(error){
    return NextResponse.json({ok:false,mode:"read-only",error:error instanceof Error?error.message:"security scan failed"}, {status:500});
  }
}
