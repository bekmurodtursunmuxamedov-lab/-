"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, CheckCircle2, Cloud, Database, GitBranch, Plus, RefreshCw, Send, Settings2, ShieldCheck, TerminalSquare, Users } from "lucide-react";

type Agent = { id:string; name:string; role:string; description:string; status:"online"|"offline"|"setup"; target?:string; capabilities:string[]; protectedAreas?:string[] };
const modes=["Inspect","Fix","Improve","Deploy"];

export default function Home(){
 const [projectStatus,setProjectStatus]=useState<any>(null),[inspection,setInspection]=useState<any>(null),[agents,setAgents]=useState<Agent[]>([{id:"printshop-engineer",name:"PRINTSHOP Engineer",role:"AI Developer",description:"Управляет разработкой существующего PRINTSHOP через безопасный GitHub → CI → Vercel workflow.",status:"online",target:"bekmurodtursunmuxamedov-lab/print-style-uz",capabilities:["Inspect","Fix","Improve","Deploy"],protectedAreas:["production DB","auth","payments","orders"]}]),[selectedId,setSelectedId]=useState("printshop-engineer"),[mode,setMode]=useState("Inspect"),[msg,setMsg]=useState(""),[messages,setMessages]=useState<string[]>([]),[busy,setBusy]=useState(false),[refreshing,setRefreshing]=useState(false);
 const selected=useMemo(()=>agents.find(a=>a.id===selectedId)||agents[0],[agents,selectedId]);
 async function loadAgents(){setRefreshing(true);try{const r=await fetch("/api/agents",{cache:"no-store"});if(r.ok){const d=await r.json();if(Array.isArray(d.agents)&&d.agents.length)setAgents(d.agents);}}catch{}finally{setRefreshing(false);}}
 async function loadStatus(){try{const r=await fetch("/api/project/status",{cache:"no-store"});if(r.ok)setProjectStatus(await r.json())}catch{}}
 useEffect(()=>{loadAgents();loadStatus();const timer=setInterval(()=>{loadStatus()},30000);return()=>clearInterval(timer)},[]);
 async function refreshAll(){await Promise.all([loadAgents(),loadStatus()])}
 async function send(){if(!msg.trim()||busy||!selected)return;const text=msg.trim();setMsg("");setMessages(v=>[...v,"USER: "+text]);setBusy(true);try{const r=await fetch("/api/task",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:selected.id,mode,message:text})});const d=await r.json();if(d.inspection)setInspection(d.inspection);setMessages(v=>[...v,"AI: "+(d.reply||d.error||"Ошибка")]);}catch{setMessages(v=>[...v,"AI: Не удалось связаться с сервером агента."])}finally{setBusy(false)}}
 const shortSha=(sha?:string)=>sha?sha.slice(0,7):"—";
 const inspectionState=inspection?.deploymentBehindGitHub?"ВЕРСИЯ ОТСТАЁТ":"СИНХРОННО";
 return <main className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brandMark"><Bot size={21}/></div><div><strong>AGENT HUB</strong><span>Control Center</span></div></div>
   <div className="sideTitle">MY AGENTS <span>{agents.length}</span></div>
   <div className="agentList">{agents.map(a=><button className={"agentItem "+(selected?.id===a.id?"selected":"")} onClick={()=>setSelectedId(a.id)} key={a.id}><div className="agentAvatar"><Bot size={17}/></div><div className="agentInfo"><b>{a.name}</b><span>{a.role}</span></div><i className={"dot "+a.status}/></button>)}<button className="addAgent" onClick={()=>alert("Подключение нового агента — следующий модуль.")}><Plus size={16}/> Подключить агента</button></div>
   <nav className="sideNav"><button className="navActive"><TerminalSquare size={17}/> Console</button><button><Users size={17}/> Agents</button><button><Activity size={17}/> Activity</button><button><Settings2 size={17}/> Settings</button></nav>
   <div className="futureCard"><b>Multi-agent ready</b><p>Новых агентов можно подключать через единый adapter/API, не меняя ядро панели.</p></div>
  </aside>
  <section className="workspace">
   <header className="topbar"><div><span className="eyebrow">CONTROL CENTER</span><h1>{selected?.name||"Agent Hub"}</h1><p>{selected?.description||"Единая панель управления AI-агентами"}</p></div><button className="refresh" onClick={refreshAll} disabled={refreshing}><RefreshCw size={16}/> Обновить</button></header>
   <section className="agentSummary"><div className="summaryIdentity"><div className="largeAvatar"><Bot size={28}/></div><div><b>{selected?.role||"AI Agent"}</b><span>{selected?.target||"No target connected"}</span></div><strong className="online"><CheckCircle2 size={15}/> {selected?.status||"setup"}</strong></div><div className="capabilities">{(selected?.capabilities||modes).map(x=><span key={x}>{x}</span>)}</div></section>
   <section className="statusGrid">{[["GitHub",GitBranch,"Source control",projectStatus?.github],["Vercel",Cloud,"Deployments",projectStatus?.vercel],["Supabase",Database,"Database",projectStatus?.supabase],["Production",Activity,"Live site",projectStatus?.production]].map(([n,I,s,d])=><div className="statusCard" key={String(n)}><div className="statusIcon"><I size={18}/></div><div><b>{n as string}</b><span>{d?(d.connected===true||d.reachable===true?"Connected":"Not connected"):"Checking…"}</span></div><strong className={(d?.connected===true||d?.reachable===true)?"ok":"warn"}>{d?(d.connected===true||d.reachable===true?"ONLINE":"SETUP"):"CHECK"}</strong></div>)}</section>
   {inspection&&<section className="panel inspectionPanel"><div className="panelHead"><div><b>Последняя инспекция</b><span>{inspection.checkedAt?new Date(inspection.checkedAt).toLocaleString("ru-RU"):"—"}</span></div><strong className={inspection.deploymentBehindGitHub?"warn":"ok"}>{inspectionState}</strong></div><div className="inspectionGrid">
    <div className="inspectionItem"><div><GitBranch size={15}/><b>GitHub</b></div><strong>{inspection.github?.connected?"ONLINE":"CHECK"}</strong><span>Branch: {inspection.github?.branch||"—"}</span><span>Commit: {shortSha(inspection.github?.latestCommit?.sha)}</span><span>{inspection.github?.latestCommit?.message||"Нет данных о последнем commit"}</span><span>Open PR: {inspection.github?.openPullRequests??0}</span></div>
    <div className="inspectionItem"><div><Cloud size={15}/><b>Vercel</b></div><strong>{inspection.vercel?.connected?"ONLINE":"CHECK"}</strong><span>Deploy: {inspection.vercel?.latestDeployment?.state||"—"}</span><span>Commit: {shortSha(inspection.vercel?.latestDeployment?.commitSha)}</span><span>{inspection.vercel?.latestDeployment?.message||"Нет данных о deployment"}</span><span>{inspection.vercel?.latestDeployment?.url||"URL недоступен"}</span></div>
    <div className="inspectionItem"><div><Database size={15}/><b>Supabase</b></div><strong>{inspection.supabase?.connected?"ONLINE":"CHECK"}</strong><span>HTTP: {inspection.supabase?.httpStatus??"—"}</span><span>Read-only health check</span><span>Секреты не отображаются</span></div>
    <div className="inspectionItem"><div><Activity size={15}/><b>Production</b></div><strong>{inspection.production?.reachable?"ONLINE":"CHECK"}</strong><span>Status: {inspection.production?.status??"—"}</span><span>{inspection.production?.reachable?"Production отвечает":"Production недоступен"}</span><span>GitHub ↔ Vercel: {inspection.deploymentBehindGitHub?"есть отставание":"совпадает"}</span></div>
   </div></section>}
   <section className="mainGrid"><div className="panel chatPanel"><div className="panelHead"><div><b>Agent Console</b><span>{busy?"Агент работает…":"Русский · готов к команде"}</span></div><div className="live"><i/> LIVE</div></div>
    <div className="modes">{modes.map(x=><button className={mode===x?"active":""} onClick={()=>setMode(x)} key={x}>{x}</button>)}</div>
    <div className="messages"><div className="agent"><b>{selected?.name||"AGENT"}</b><p>Готов. Сначала проверяю состояние проекта, затем планирую изменение. Опасные действия требуют подтверждения.</p></div>{messages.map((m,i)=><div className={m.startsWith("AI:")?"agent":"user"} key={i}>{m}</div>)}</div>
    <div className="composer"><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Например: проверь последний failed deployment"/><button onClick={send} disabled={busy||!selected}><Send size={18}/></button></div>
   </div><aside className="rightColumn">
    <div className="panel"><div className="panelHead"><b>Protection</b><ShieldCheck size={19}/></div><ul><li>Constructor — editable</li><li>Production DB — confirmation</li><li>Secrets — never exposed</li><li>Orders/users — never deleted</li></ul></div>
    <div className="panel"><div className="panelHead"><b>Agent architecture</b><Bot size={19}/></div><div className="architecture"><span>AGENT HUB</span><em>→</em><span>Adapter</span><em>→</em><span>Agent</span></div><p className="muted">Каждый новый агент получает ID, capabilities, target и собственные правила безопасности.</p></div>
    <div className="panel"><div className="panelHead"><b>Future agents</b><Plus size={18}/></div><div className="planned">Design Agent <span>planned</span></div><div className="planned">QA Agent <span>planned</span></div><div className="planned">Analytics Agent <span>planned</span></div></div>
   </aside></section>
  </section>
 </main>
}