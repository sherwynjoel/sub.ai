"use client";
import { useState } from "react";

type Cfg = { provider: string; model: string; sttModel: string };
const LABELS: Record<string, string> = {
  gemini: "Google Gemini (hears audio directly)",
  openai: "OpenAI (Whisper + GPT)",
  groq: "Groq (fast Whisper + Llama)",
  custom: "Custom OpenAI-compatible (AI_BASE_URL)",
};

export default function AdminAi({ current, providers, defaults }: { current: Cfg; providers: string[]; defaults: Record<string, Omit<Cfg, "provider">> }) {
  const [cfg, setCfg] = useState(current);
  const [msg, setMsg] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/admin/settings", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(cfg) });
    setMsg(res.ok ? "Saved. New projects use this model." : (await res.json()).error);
  }

  return (
    <form className="ai-form" onSubmit={save}>
      <label>Provider
        <select value={cfg.provider} onChange={(e) => setCfg({ provider: e.target.value, ...defaults[e.target.value] })}>
          {providers.map((p) => <option key={p} value={p}>{LABELS[p] ?? p}</option>)}
        </select>
      </label>
      <label>{cfg.provider === "gemini" ? "Model" : "Translation model"}
        <input value={cfg.model} onChange={(e) => setCfg({ ...cfg, model: e.target.value })} required />
      </label>
      {cfg.provider !== "gemini" && (
        <label>Speech-to-text model
          <input value={cfg.sttModel} onChange={(e) => setCfg({ ...cfg, sttModel: e.target.value })} required />
        </label>
      )}
      <button className="btn">Save AI settings</button>
      {msg && <p role="status" className="notice">{msg}</p>}
    </form>
  );
}
