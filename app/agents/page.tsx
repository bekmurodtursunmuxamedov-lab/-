"use client";

import { FormEvent, useEffect, useState } from "react";

type Agent = {
  id: string;
  name: string;
  role: string;
  target: string;
  status: string;
  capabilities: string[];
  protected: string[];
};

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [id, setId] = useState("");
  const [name, setName] = useState("");
  const [target, setTarget] = useState("");
  const [message, setMessage] = useState("Загрузка реестра...");
  const [busy, setBusy] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [tasks, setTasks] = useState<Array<{ id: string; agentId: string; message: string; status: string }>>([]);

  const load = async () => {
    const response = await fetch("/api/agents", { cache: "no-store" });
    const data = await response.json();
    setAgents(data.agents || []);
    setMessage(data.persistence ? "Реестр загружен." : "Реестр работает в безопасном preview-режиме: изменения пока не сохраняются.");
  };

  const loadTasks = async () => {
    const response = await fetch("/api/agent/tasks", { cache: "no-store" });
    const data = await response.json();
    setTasks(data.tasks || []);
  };

  useEffect(() => { load(); loadTasks(); }, []);

  const previewRegistration = async (event: FormEvent) => {
    event.preventDefault();
    if (!id.trim() || !name.trim() || !target.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ id, name, target }),
      });
      const data = await response.json();
      setMessage(data.message || data.error || "Готово");
      if (data.ok) {
        setAgents(current => [...current.filter(agent => agent.id !== data.agent.id), data.agent]);
      }
    } catch {
      setMessage("Не удалось связаться с реестром.");
    } finally {
      setBusy(false);
    }
  };

  const createTask = async (event: FormEvent) => {
    event.preventDefault();
    if (!taskText.trim() || busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agent/tasks", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: "printshop-engineer", message: taskText }),
      });
      const data = await response.json();
      setMessage(data.error || (data.ok ? "Задача добавлена в очередь." : "Не удалось создать задачу."));
      setTaskText("");
      await loadTasks();
    } catch {
      setMessage("Не удалось добавить задачу.");
    } finally {
      setBusy(false);
    }
  };

  const setAgentStatus = async (agentId: string, status: "active" | "paused") => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agents", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ action: "status", id: agentId, status }),
      });
      const data = await response.json();
      setMessage(data.error || (data.ok ? `Агент: ${status}` : "Не удалось изменить статус."));
      await load();
    } catch {
      setMessage("Не удалось изменить статус агента.");
    } finally {
      setBusy(false);
    }
  };

  const runTask = async (taskId: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const response = await fetch("/api/agent/tasks/run", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      const data = await response.json();
      setMessage(data.error || data.nextAction || "Задача обработана.");
      await loadTasks();
    } catch {
      setMessage("Не удалось запустить задачу.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="shell">
      <a href="/" className="muted">← Control Plane</a>
      <h1 className="title">Agent Registry</h1>
      <p className="muted">Управление подключенными AI-агентами. Сейчас регистрация безопасно работает как preview.</p>

      <section className="card">
        <div className="small muted">NEW AGENT</div>
        <form onSubmit={previewRegistration} className="console" style={{ marginTop: 12 }}>
          <div className="row">
            <input className="input" value={id} onChange={e => setId(e.target.value)} placeholder="agent-id" />
            <input className="input" value={name} onChange={e => setName(e.target.value)} placeholder="Название агента" />
          </div>
          <div className="row" style={{ marginTop: 10 }}>
            <input className="input" value={target} onChange={e => setTarget(e.target.value)} placeholder="GitHub repo owner/repo" />
            <button className="send" type="submit" disabled={busy}>{busy ? "..." : "Проверить агента"}</button>
          </div>
        </form>
        <div className="small muted" style={{ marginTop: 12 }}>{message}</div>
      </section>

      <section className="card" style={{ marginTop: 16 }}>
        <div className="small muted">TASK QUEUE</div>
        <form onSubmit={createTask} className="console" style={{ marginTop: 12 }}>
          <div className="row">
            <input className="input" value={taskText} onChange={e => setTaskText(e.target.value)} placeholder="Например: проверь доступность каталога" />
            <button className="send" type="submit" disabled={busy}>{busy ? "..." : "Создать задачу"}</button>
          </div>
        </form>
        <div style={{ marginTop: 12 }}>
          {tasks.length === 0 ? (
            <div className="small muted">Очередь пока пуста.</div>
          ) : tasks.map(task => (
            <div className="row" key={task.id} style={{ marginTop: 8 }}>
              <div style={{ flex: 1 }}>
                <strong className="small">{task.message}</strong>
                <div className="small muted">{task.id} · {task.status}</div>
              </div>
              {task.status === "queued" && <button className="send" type="button" onClick={() => runTask(task.id)} disabled={busy}>Запустить</button>}
            </div>
          ))}
        </div>
      </section>

      <section className="grid">
        {agents.map(agent => (
          <article className="card" key={agent.id}>
            <strong>{agent.name}</strong>
            <div className="small muted">{agent.id}</div>
            <p className="small">{agent.role}</p>
            <p className="small muted">{agent.target}</p>
            <div className="small">{agent.capabilities.join(" · ")}</div>
            <p className="small"><span className="ok">{agent.status}</span></p>
            <div className="row">
              {agent.status === "active" ? (
                <button className="send" type="button" onClick={() => setAgentStatus(agent.id, "paused")} disabled={busy}>Пауза</button>
              ) : (
                <button className="send" type="button" onClick={() => setAgentStatus(agent.id, "active")} disabled={busy}>Возобновить</button>
              )}
            </div>
            <div className="small muted">Protected: {agent.protected.join(" · ")}</div>
          </article>
        ))}
      </section>

      <div className="footer">Production source, database, auth, payments, orders и PRINTSHOP constructor не изменяются через этот экран.</div>
    </main>
  );
}
