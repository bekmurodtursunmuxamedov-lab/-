"use client";

import { useEffect, useState } from "react";

type Integration = { service: string; key: string; configured: boolean };
type Dashboard = { controlPlane?: { monitoring: string; security: string; orchestration: string; repair: string; verification: string; production: string } };
type Activity = { id: string; stage: string; status: string; message: string };
type Health = { ok?: boolean; status?: number; latencyMs?: number };
type Agent = { id: string; name: string; role: string; status: string; target: string; capabilities: string[]; protected: string[] };

export default function Home() {
  const [ints, setInts] = useState<Integration[]>([]);
  const [dashboard, setDashboard] = useState<Dashboard>({});
  const [activity, setActivity] = useState<Activity[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [mode, setMode] = useState("Inspect");
  const [msg, setMsg] = useState("");
  const [out, setOut] = useState("Готов. Inspect — проверка, Plan — безопасный план без изменений.");
  const [busy, setBusy] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const refresh = async () => {
    const [i, d, a, h, reg] = await Promise.all([
      fetch("/api/integrations").then(r => r.json()),
      fetch("/api/agent/dashboard").then(r => r.json()),
      fetch("/api/agent/activity").then(r => r.json()),
      fetch("/api/agent/health").then(r => r.json()),
      fetch("/api/agent/registry").then(r => r.json()),
    ]);
    setInts(i.integrations || []);
    setDashboard(d);
    setActivity(a.activities || []);
    setHealth(h);
    setAgents(reg.agents || []);
  };

  useEffect(() => { refresh(); }, []);

  const run = async () => {
    if (!msg.trim() || busy) return;
    setBusy(true); setOut("Агент анализирует задачу...");
    try {
      const r = await fetch("/api/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode, message: msg }) });
      const j = await r.json();
      if (j.fallback === "Offline" && mode !== "Offline") {
        const fr = await fetch("/api/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "Offline", message: msg }) });
        const fj = await fr.json();
        setOut((j.output || "AI Gateway недоступен.") + "\n\n[Автоматически переключено на Offline]\n" + (fj.output || fj.error || "Offline не вернул результат."));
      } else setOut(j.output || j.error || "Нет ответа");
    } catch { setOut("Ошибка соединения с Agent Hub."); }
    finally { setBusy(false); refresh(); }
  };

  const prepareDraft = async () => {
    if (!msg.trim() || busy) return;
    setBusy(true); setConfirmed(true); setOut("Агент готовит Draft PR...");
    try {
      const r = await fetch("/api/task", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ mode: "Prepare", message: msg, confirmed: true }) });
      const j = await r.json(); setOut(j.output || j.error || "Нет ответа");
    } catch { setOut("Ошибка соединения с Agent Hub."); }
    finally { setBusy(false); refresh(); }
  };

  const connected = (s: string) => ints.find(i => i.service.toLowerCase().includes(s))?.configured;
  const cp = dashboard.controlPlane || {};
  const stages: [string, string | undefined][] = [
    ["Monitoring", cp.monitoring], ["Security", cp.security], ["Orchestration", cp.orchestration],
    ["Repair", cp.repair], ["Verification", cp.verification], ["Production", cp.production],
  ];

  return <main className="shell">
    <span className="badge">⚡ AGENT HUB · CONTROL PLANE</span>
    <h1 className="title">PRINTSHOP Engineer</h1>
    <p className="muted">Автономный инженерный центр управления PRINTSHOP.</p>

    <section className="grid">
      {["github", "vercel", "supabase", "ai gateway"].map(n => <div className="card" key={n}><div className="small muted">{n}</div><strong className={connected(n) ? "ok" : "bad"}>{connected(n) ? "CONNECTED" : "NOT CONNECTED"}</strong></div>)}
    </section>

    <section className="card">
      <div className="small muted">AGENTS</div>
      {agents.map(agent => <div key={agent.id} className="agent-row">
        <strong>{agent.name}</strong> <span className="ok">{agent.status}</span>
        <div className="small muted">{agent.role} · {agent.target}</div>
        <div className="small">{agent.capabilities.join(" · ")}</div>
      </div>)}
    </section>

    <section className="grid">
      {stages.map(([name, value]) => <div className="card" key={name}><div className="small muted">{name}</div><strong>{value || "unknown"}</strong></div>)}
    </section>

    <section className="card">
      <div className="small muted">PRINTSHOP HEALTH</div>
      <strong className={health?.ok ? "ok" : "bad"}>{health ? (health.ok ? "ONLINE" : "CHECK FAILED") : "CHECKING..."}</strong>
      {health && <div className="small muted">HTTP {health.status} · {health.latencyMs} ms</div>}
    </section>

    <section className="console">
      <div className="modes">{["Inspect", "Plan", "Offline", "Fix", "Improve", "Deploy"].map(m => <button className={"mode " + (mode === m ? "active" : "")} onClick={() => { setMode(m); setConfirmed(false); }} key={m}>{m}</button>)}</div>
      <div className="row"><input className="input" value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && run()} placeholder="Например: проверь последний deployment PRINTSHOP" /><button className="send" onClick={run} disabled={busy}>{busy ? "..." : "Запустить"}</button></div>
      <div className="output">{out}</div>
      {mode === "Plan" && <button className="send" onClick={prepareDraft} disabled={confirmed || busy}>{confirmed ? "Подготовка..." : "Подтвердить план и подготовить Draft PR"}</button>}
    </section>

    <section className="card">
      <div className="small muted">ACTIVITY</div>
      {activity.map(item => <div key={item.id} className="small">{item.stage}: {item.status} — {item.message}</div>)}
    </section>

    <div className="footer">Protected: production DB · auth · payments · orders. Конструктор PRINTSHOP не изменяется без явного запроса.</div>
  </main>;
}
