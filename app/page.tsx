"use client";

import { useEffect, useMemo, useState } from "react";
import { Activity, Bot, CheckCircle2, Cloud, Database, GitBranch, Plus, RefreshCw, Send, Settings2, ShieldCheck, TerminalSquare, Users } from "lucide-react";

type Agent = { id:string; name:string; role:string; description:string; status:"online"|"offline"|"setup"; target?:string; capabilities:string[]; protectedAreas?:string[] };
const modes=["Inspect","Fix","Improve","Deploy"];

export default function Home(){
 const [agents,setAgents]=useState<Agent[]>([{id:"printshop-engineer",name:"PRINTSHOP Engineer",role:"AI Developer",description:"Управляет разработкой существующего PRINTSHOP через безопасный GitHub → CI → Vercel workflow.",status:"online",target:"bekmurodtursunmuxamedov-lab/print-style-uz",capabilities:["Inspect","Fix","Improve","Deploy"],protectedAreas:["constructor","production DB","auth","payments","orders"]}]),[selectedId,setSelectedId]=useState("printshop-engineer"),[mode,setMode]=useState("Inspect"),[msg,setMsg]=useState(""),[messages,setMessages]=useState<string[]>([]),[busy,setBusy]=useState(false),[refreshing,setRefreshing]=useState(false);
 const selected=useMemo(()=>agents.find(a=>a.id===selectedId)||agents[0],[agents,selectedId]);
 async function loadAgents(){setRefreshing(true);try{const r=await fetch("/api/agents",{cache:"no-store"});if(r.ok){const d=await r.json();if(Array.isArray(d.agents)&&d.agents.length)setAgents(d.agents);}}catch{}finally{setRefreshing(false);}}
 useEffect(()=>{loadAgents()},[]);
 async function send(){if(!msg.trim()||busy||!selected)return;const text=msg.trim();setMsg("");setMessages(v=>[...v,"USER: "+text]);setBusy(true);try{const r=await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({agentId:selected.id,mode,message:text})});const d=await r.json();setMessages(v=>[...v,"AI: "+(d.reply||d.error||"Ошибка")]);}catch{setMessages(v=>[...v,"AI: Не удалось связаться с сервером агента."])}finally{setBusy(false)}}
 return <main className="shell">
  <aside className="sidebar">
   <div className="brand"><div className="brandMark"><Bot size={21}/></div><div><strong>AGENT HUB</strong><span>Control Center</span></div></div>
   <div className="sideTitle">MY AGENTS <span>{agents.length}</span></div>
   <div className="agentList">{agents.map(a=><button className={"agentItem "+(selected?.id===a.id?"selected":"")} onClick={()=>setSelectedId(a.id)} key={a.id}><div className="agentAvatar"><Bot size={17}/></div><div className="agentInfo"><b>{a.name}</b><span>{a.role}</span></div><i className={"dot "+a.status}/></button>)}<button className="addAgent" onClick={()=>alert("Подключение нового агента — следующий модуль.")}><Plus size={16}/> Подключить агента</button></div>
   <nav className="sideNav"><button className="navActive"><TerminalSquare size={17}/> Console</button><button><Users size={17}/> Agents</button><button><Activity size={17}/> Activity</button><button><Settings2 size={17}/> Settings</button></nav>
   <div className="futureCard"><b>Multi-agent ready</b><p>Новых агентов можно подключать через единый adapter/API, не меняя ядро панели.</p></div>
  </aside>
  <section className="workspace">
   <header className="topbar"><div><span className="eyebrow">CONTROL CENTER</span><h1>{selected?.name||"Agent Hub"}</h1><p>{selected?.description||"Единая панель управления AI-агентами"}</p></div><button className="refresh" onClick={loadAgents} disabled={refreshing}><RefreshCw size={16}/> Обновить</button></header>
   <section className="agentSummary"><div className="summaryIdentity"><div className="largeAvatar"><Bot size={28}/></div><div><b>{selected?.role||"AI Agent"}</b><span>{selected?.target||"No target connected"}</span></div><strong className="online"><CheckCircle2 size={15}/> {selected?.status||"setup"}</strong></div><div className="capabilities">{(selected?.capabilities||modes).map(x=><span key={x}>{x}</span>)}</div></section>
   <section className="statusGrid">{[["GitHub",GitBranch,"Source control"],["Vercel",Cloud,"Deployments"],["Supabase",Database,"Database"],["Production",Activity,"Live site"]].map(([n,I,s])=><div className="statusCard" key={String(n)}><div className="statusIcon"><I size={18}/></div><div><b>{n as string}</b><span>{s as string}</span></div><strong>Monitor</strong></div>)}</section>
   <section className="mainGrid"><div className="panel chatPanel"><div className="panelHead"><div><b>Agent Console</b><span>{busy?"Агент работает…":"Русский · готов к команде"}</span></div><div className="live"><i/> LIVE</div></div>
    <div className="modes">{modes.map(x=><button className={mode===x?"active":""} onClick={()=>setMode(x)} key={x}>{x}</button>)}</div>
    <div className="messages"><div className="agent"><b>{selected?.name||"AGENT"}</b><p>Готов. Сначала проверяю состояние проекта, затем планирую изменение. Опасные действия требуют подтверждения.</p></div>{messages.map((m,i)=><div className={m.startsWith("AI:")?"agent":"user"} key={i}>{m}</div>)}</div>
    <div className="composer"><input value={msg} onChange={e=>setMsg(e.target.value)} onKeyDown={e=>e.key==="Enter"&&send()} placeholder="Например: проверь последний failed deployment"/><button onClick={send} disabled={busy||!selected}><Send size={18}/></button></div>
   </div><aside className="rightColumn">
    <div className="panel"><div className="panelHead"><b>Protection</b><ShieldCheck size={19}/></div><ul><li>Constructor — protected</li><li>Production DB — confirmation</li><li>Secrets — never exposed</li><li>Orders/users — never deleted</li></ul></div>
    <div className="panel"><div className="panelHead"><b>Agent architecture</b><Bot size={19}/></div><div className="architecture"><span>AGENT HUB</span><em>→</em><span>Adapter</span><em>→</em><span>Agent</span></div><p className="muted">Каждый новый агент получает ID, capabilities, target и собственные правила безопасности.</p></div>
    <div className="panel"><div className="panelHead"><b>Future agents</b><Plus size={18}/></div><div className="planned">Design Agent <span>planned</span></div><div className="planned">QA Agent <span>planned</span></div><div className="planned">Analytics Agent <span>planned</span></div></div>
   </aside></section>
  </section>
 </main>
}
