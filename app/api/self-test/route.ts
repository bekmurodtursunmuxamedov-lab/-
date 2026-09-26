import {NextResponse} from "next/server";
import OpenAI from "openai";
import {githubConfigured,inspectPrintshop} from "../../../lib/github";

export async function GET(){
  const checks:{name:string;ok:boolean;detail:string}[]=[];
  try{
    const configured=githubConfigured();
    checks.push({name:"GitHub token",ok:configured,detail:configured?"configured":"missing"});
    if(configured){
      const p=await inspectPrintshop();
      checks.push({name:"PRINTSHOP GitHub read",ok:true,detail:`${p.repository} @ ${p.defaultBranch}`});
    }
  }catch(e){
    checks.push({name:"PRINTSHOP GitHub read",ok:false,detail:e instanceof Error?e.message:"unknown error"});
  }
  const key=process.env.AI_GATEWAY_API_KEY||process.env.AI_API_KEY;
  const model=process.env.AI_MODEL||"openai/gpt-5.5";
  if(!key){
    checks.push({name:"AI Gateway",ok:false,detail:"missing key"});
  }else{
    try{
      const client=new OpenAI({apiKey:key,baseURL:"https://ai-gateway.vercel.sh/v1"});
      const r=await client.chat.completions.create({model,messages:[{role:"system",content:"Return exactly OK."},{role:"user",content:"Health check. Return exactly OK."}],max_tokens:5});
      const text=String(r.choices[0]?.message?.content||"").trim();
      checks.push({name:"AI Gateway request",ok:text.length>0,detail:text.slice(0,40)});
    }catch(e){
      checks.push({name:"AI Gateway request",ok:false,detail:e instanceof Error?e.message:"unknown error"});
    }
  }
  const ok=checks.every(x=>x.ok);
  return NextResponse.json({ok,mode:"read-only",checks,productionWrites:false,constructorChanged:false});
}
