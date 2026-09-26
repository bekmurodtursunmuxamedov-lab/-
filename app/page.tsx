"use client";

import { useEffect, useMemo, useState } from "react";

type Agent = {
  id: string;
  name: string;
  role: string;
  description: string;
  status: "online" | "offline" | "setup";
  target?: string;
  capabilities: string[];
  protectedAreas?: string[];
};

const modes = ["Inspect", "Fix", "Improve", "Deploy"];

export default function Home() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedId, setSelectedId] = useState("printshop-engineer");
  const [mode, setMode] = useState("Inspect");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<string[]>([]);
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [integrations, setIntegrations] = useState<any>(null);
  const [inspection, setInspection] = useState<any>(null);
  const [execution, setExecution] = useState<any>(null);
  const [findings, setFindings] = useState<any[]>([]);
  const [actions, setActions] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selected = useMemo(
    () => agents.find((agent) => agent.id === selectedId) || agents[0],
    [agents, selectedId],
  );

  async function refresh() {
    setRefreshing(true);
    try {
      const [agentsRes, statusRes, integrationRes] = await Promise.all([
        fetch("/api/agents", { cache: "no-store" }),
        fetch("/api/project/status", { cache: "no-store" }),
        fetch("/api/integrations", { cache: "no-store" }),
      ]);
      if (agentsRes.ok) {
        const data = await agentsRes.json();
        if (Array.isArray(data.agents)) setAgents(data.agents);
      }
      if (statusRes.ok) setStatus(await statusRes.json());
      if (integrationRes.ok) setIntegrations(await integrationRes.json());
    } catch {
      // Individual panels keep their last known state.
    } finally {
      setRefreshing(false);
    }
  }

  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 30000);
    return () => clearInterval(timer);
  }, []);

  async function sendTask() {
    const text = message.trim();
    if (!text || busy || !selected) return;
    setMessage("");
    setMessages((current) => [...current, "USER: " + text]);
    setBusy(true);
    try {
      const response = await fetch("/api/task", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId: selected.id, mode, message: text }),
      });
      const data = await response.json();
      if (data.inspection) setInspection(data.inspection);
      if (Array.isArray(data.findings)) setFindings(data.findings);
      if (Array.isArray(data.recommendedActions)) setActions(data.recommendedActions);
      if (data.execution) setExecution(data.execution);
      setMessages((current) => [
        ...current,
        "AI: " + (data.reply || data.error || "Задача обработана."),
      ]);
    } catch {
      setMessages((current) => [...current, "AI: Сервер агента недоступен."]);
    } finally {
      setBusy(false);
      refresh();
    }
  }

  const configuredCount = integrations?.integrations?.filter((item: any) => item.configured).length || 0;
  const totalIntegrations = integrations?.integrations?.length || 0;

  return (
    <main style={styles.page}>
      <aside style={styles.sidebar}>
        <div>
          <div style={styles.logo}>⚡ AGENT HUB</div>
          <div style={styles.subtle}>PRINTSHOP Control Center</div>
        </div>

        <div style={styles.sectionTitle}>MY AGENTS</div>
        {agents.map((agent) => (
          <button
            key={agent.id}
            onClick={() => setSelectedId(agent.id)}
            style={{ ...styles.agentButton, ...(agent.id === selected?.id ? styles.agentSelected : {}) }}
          >
            <span style={styles.agentDot}>●</span>
            <span>
              <b>{agent.name}</b>
              <small style={styles.block}>{agent.role}</small>
            </span>
          </button>
        ))}

        <div style={{ marginTop: "auto", ...styles.subtle }}>
          Constructor: editable
          <br />
          Production DB/auth/payments/orders: confirmation required
          <br />
          Secrets: never displayed
        </div>
      </aside>

      <section style={styles.content}>
        <header style={styles.header}>
          <div>
            <div style={styles.kicker}>AI ENGINEERING MANAGER</div>
            <h1 style={styles.h1}>{selected?.name || "PRINTSHOP Engineer"}</h1>
            <p style={styles.muted}>{selected?.description || "Безопасное управление PRINTSHOP"}</p>
          </div>
          <button onClick={refresh} disabled={refreshing} style={styles.button}>
            {refreshing ? "Обновление…" : "Обновить"}
          </button>
        </header>

        <section style={styles.grid4}>
          <StatusCard name="GitHub" data={status?.github} />
          <StatusCard name="Vercel" data={status?.vercel} />
          <StatusCard name="Supabase" data={status?.supabase} />
          <StatusCard name="Production" data={status?.production} />
        </section>

        <section style={styles.panel}>
          <div style={styles.rowBetween}>
            <div>
              <b>Интеграции агента</b>
              <div style={styles.muted}>
                {integrations ? configuredCount + "/" + totalIntegrations + " переменных настроено" : "Проверка…"}
              </div>
            </div>
            <strong style={{ color: integrations?.configured ? "#66e3a4" : "#ffbf69" }}>
              {integrations?.configured ? "READY" : "SETUP"}
            </strong>
          </div>

          <div style={styles.integrationGrid}>
            {integrations?.integrations?.map((item: any) => (
              <div key={item.key} style={styles.integrationItem}>
                <span>{item.service}</span>
                <strong style={{ color: item.configured ? "#66e3a4" : "#ffbf69" }}>
                  {item.configured ? "✓" : "—"}
                </strong>
                <small>{item.key}</small>
              </div>
            ))}
          </div>

          {!integrations?.configured && (
            <div style={styles.notice}>
              Агент ещё не может управлять PRINTSHOP полностью: в Vercel Production нужно
              добавить server-side переменные из <code>.env.example</code>. Значения секретов
              не нужно отправлять в чат.
            </div>
          )}
        </section>

        <section style={styles.mainGrid}>
          <div style={styles.panel}>
            <div style={styles.rowBetween}>
              <div>
                <b>Agent Console</b>
                <div style={styles.muted}>{busy ? "Агент работает…" : "Готов к команде"}</div>
              </div>
              <span style={styles.live}>● LIVE</span>
            </div>

            <div style={styles.modeRow}>
              {modes.map((item) => (
                <button
                  key={item}
                  onClick={() => setMode(item)}
                  style={{ ...styles.modeButton, ...(mode === item ? styles.modeActive : {}) }}
                >
                  {item}
                </button>
              ))}
            </div>

            <div style={styles.console}>
              <div style={styles.agentMessage}>
                <b>{selected?.name || "PRINTSHOP Engineer"}</b>
                <p style={styles.muted}>
                  Сначала проверю состояние проекта, затем сформирую план.
                  Изменения в production и критических областях требуют подтверждения.
                </p>
              </div>
              {messages.map((item, index) => (
                <div key={index} style={item.startsWith("AI:") ? styles.agentMessage : styles.userMessage}>
                  {item}
                </div>
              ))}
            </div>

            <div style={styles.composer}>
              <input
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") sendTask();
                }}
                placeholder="Например: проверь последний deployment PRINTSHOP"
                style={styles.input}
              />
              <button onClick={sendTask} disabled={busy || !selected} style={styles.sendButton}>
                Отправить
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gap: 16 }}>
            {inspection && (
              <section style={styles.panel}>
                <div style={styles.rowBetween}>
                  <b>Последняя инспекция</b>
                  <span style={inspection.deploymentBehindGitHub ? styles.warn : styles.ok}>
                    {inspection.deploymentBehindGitHub ? "OUT OF SYNC" : "SYNC"}
                  </span>
                </div>
                <div style={styles.diagnostics}>
                  <div>GitHub: {inspection.github?.connected ? "ONLINE" : "CHECK"}</div>
                  <div>Vercel: {inspection.vercel?.connected ? "ONLINE" : "CHECK"}</div>
                  <div>Supabase: {inspection.supabase?.connected ? "ONLINE" : "CHECK"}</div>
                  <div>Production: {inspection.production?.reachable ? "ONLINE" : "CHECK"}</div>
                </div>
              </section>
            )}

            {findings.length > 0 && (
              <section style={styles.panel}>
                <b>Findings</b>
                {findings.map((finding, index) => (
                  <div key={index} style={styles.finding}>
                    <strong>{finding.title || finding.area}</strong>
                    <div style={styles.muted}>{finding.detail}</div>
                  </div>
                ))}
              </section>
            )}

            {actions.length > 0 && (
              <section style={styles.panel}>
                <b>План действий</b>
                <ol>
                  {actions.map((action, index) => <li key={index}>{action}</li>)}
                </ol>
              </section>
            )}

            {execution && (
              <section style={styles.panel}>
                <b>Результат выполнения</b>
                <div style={styles.diagnostics}>
                  <span>Risk: {execution.risk || "—"}</span>
                  <span>Branch: {execution.branch || "—"}</span>
                  <span>PR: {execution.pr?.number ? "#" + execution.pr.number : "—"}</span>
                </div>
                {execution.pr?.url && (
                  <a href={execution.pr.url} target="_blank" rel="noreferrer" style={styles.link}>
                    Открыть draft PR
                  </a>
                )}
              </section>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

function StatusCard({ name, data }: { name: string; data?: any }) {
  const online = Boolean(data?.connected === true || data?.reachable === true);
  return (
    <div style={styles.statusCard}>
      <b>{name}</b>
      <span style={styles.muted}>{data ? (online ? "Connected" : "Not connected") : "Checking…"}</span>
      <strong style={{ color: online ? "#66e3a4" : "#ffbf69" }}>
        {data ? (online ? "ONLINE" : "SETUP") : "CHECK"}
      </strong>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", display: "flex", background: "#080a0d", color: "#f4f6f8", fontFamily: "Inter, system-ui, sans-serif" },
  sidebar: { width: 250, padding: 24, borderRight: "1px solid #20252c", display: "flex", flexDirection: "column", gap: 14, boxSizing: "border-box" },
  logo: { fontWeight: 800, letterSpacing: 1 },
  subtle: { color: "#7f8996", fontSize: 12, lineHeight: 1.5 },
  sectionTitle: { color: "#7f8996", fontSize: 11, letterSpacing: 1.4, marginTop: 24 },
  agentButton: { display: "flex", gap: 10, alignItems: "center", textAlign: "left", padding: 12, borderRadius: 10, border: "1px solid transparent", background: "transparent", color: "inherit", cursor: "pointer" },
  agentSelected: { background: "#151a20", borderColor: "#2b333d" },
  agentDot: { color: "#66e3a4" },
  block: { display: "block", color: "#7f8996", marginTop: 3 },
  content: { flex: 1, padding: 30, maxWidth: 1500, boxSizing: "border-box" },
  header: { display: "flex", justifyContent: "space-between", gap: 20, alignItems: "flex-start", marginBottom: 22 },
  kicker: { color: "#7f8996", fontSize: 11, letterSpacing: 1.5 },
  h1: { margin: "6px 0", fontSize: 28 },
  muted: { color: "#8993a0", fontSize: 13, lineHeight: 1.5 },
  button: { background: "#161c23", color: "#fff", border: "1px solid #303844", borderRadius: 8, padding: "10px 14px", cursor: "pointer" },
  grid4: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, marginBottom: 16 },
  statusCard: { background: "#101419", border: "1px solid #202731", borderRadius: 12, padding: 16, display: "grid", gap: 6 },
  panel: { background: "#101419", border: "1px solid #202731", borderRadius: 12, padding: 18 },
  rowBetween: { display: "flex", justifyContent: "space-between", gap: 15, alignItems: "center" },
  integrationGrid: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 8, marginTop: 14 },
  integrationItem: { background: "#0b0e12", borderRadius: 8, padding: 10, display: "grid", gridTemplateColumns: "1fr auto", gap: 3 },
  notice: { marginTop: 14, padding: 12, borderRadius: 8, background: "#241d12", color: "#ffcf8b", fontSize: 13 },
  mainGrid: { display: "grid", gridTemplateColumns: "minmax(0, 1.6fr) minmax(300px, .8fr)", gap: 16, marginTop: 16 },
  modeRow: { display: "flex", gap: 7, margin: "15px 0" },
  modeButton: { border: "1px solid #2b333d", background: "#0b0e12", color: "#9ba5b1", padding: "8px 12px", borderRadius: 7, cursor: "pointer" },
  modeActive: { background: "#202833", color: "#fff" },
  console: { minHeight: 260, maxHeight: 480, overflow: "auto", background: "#080a0d", border: "1px solid #202731", borderRadius: 8, padding: 14 },
  agentMessage: { padding: "10px 12px", borderLeft: "2px solid #66e3a4", marginBottom: 10 },
  userMessage: { padding: "10px 12px", background: "#151a20", borderRadius: 7, marginBottom: 10, whiteSpace: "pre-wrap" },
  composer: { display: "flex", gap: 8, marginTop: 10 },
  input: { flex: 1, background: "#0b0e12", border: "1px solid #303844", borderRadius: 8, color: "#fff", padding: "12px" },
  sendButton: { background: "#66e3a4", color: "#06100a", border: 0, borderRadius: 8, padding: "0 18px", fontWeight: 700, cursor: "pointer" },
  live: { color: "#66e3a4", fontSize: 12 },
  diagnostics: { display: "grid", gap: 8, marginTop: 14 },
  finding: { marginTop: 12, padding: 10, borderRadius: 8, background: "#0b0e12" },
  ok: { color: "#66e3a4" },
  warn: { color: "#ffbf69" },
  link: { display: "inline-block", marginTop: 12, color: "#8db8ff" },
};
