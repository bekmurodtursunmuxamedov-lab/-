import { NextResponse } from "next/server";
import { PRINTSHOP_RULES } from "../../../lib/policy";

const protectedWords = [...PRINTSHOP_RULES.requireConfirmation, ...PRINTSHOP_RULES.protectedPaths];
function needsConfirmation(message:string, mode:string){
  const value = message.toLowerCase();
  return mode === "Deploy" || protectedWords.some(word => value.includes(word.toLowerCase())) ||
    /production|database|auth|payment|order|constructor|delete|drop|secret|token|key/.test(value);
}
export async function POST(req:Request){
  const body=await req.json().catch(()=>({}));
  const message=typeof body.message==="string"?body.message.trim():"";
  const mode=typeof body.mode==="string"?body.mode:"Inspect";
  if(!message)return NextResponse.json({error:"message is required"},{status:400});
  const confirmation=needsConfirmation(message,mode);
  const plan=["1. Inspect current PRINTSHOP commit and deployment state.","2. Analyze the requested change without touching protected areas.",confirmation?"3. Prepare the exact change and stop for explicit confirmation before execution.":"3. Prepare a minimal safe change plan.","4. Validate build/runtime impact, then report the result."];
  return NextResponse.json({
    task:{id:crypto.randomUUID(),agentId:body.agentId||"printshop-engineer",mode,status:confirmation?"awaiting_confirmation":"planned",message,stages:["received","inspecting","planning",...(confirmation?["awaiting_confirmation"]:["ready_for_execution"])]},
    reply:(confirmation?"Задача принята. Я сначала проверю проект и подготовлю план. Перед изменением защищённых или production-зон потребуется твоё подтверждение.\n\n":"Задача принята. Безопасный режим: сначала проверка и планирование.\n\n")+plan.join("\n")
  });
}