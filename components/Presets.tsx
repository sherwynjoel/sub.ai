"use client";
import { useEffect, useState } from "react";
import { styleOf, type CaptionCustom } from "@/lib/captionStyles";
import { presetLook } from "@/lib/presets";

export type Preset = { id: string; name: string; styleId: string; custom: CaptionCustom; isDefault: boolean };

// The same look whatever order its settings were saved in.
const canon = (v: unknown): unknown => (Array.isArray(v) ? v.map(canon) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon((v as Record<string, unknown>)[k])])) : v);
const same = (a: unknown, b: unknown) => JSON.stringify(canon(a)) === JSON.stringify(canon(b));

/**
 * The user's saved looks ("My brand"): one tap puts one on the project, "Save this look" keeps the current one, the
 * star marks the one every new video starts with.
 */
export default function Presets({ styleId, custom, onApply }: { styleId: string; custom: CaptionCustom; onApply: (p: Preset) => void }) {
  const [presets, setPresets] = useState<Preset[] | null>(null);
  const [naming, setNaming] = useState<string | null>(null); // the name being typed for a new one
  const [msg, setMsg] = useState("");
  useEffect(() => {
    fetch("/api/presets").then((r) => (r.ok ? r.json() : null)).then((d) => setPresets(d?.presets ?? null)).catch(() => setPresets(null));
  }, []);
  if (!presets) return null; // signed out (or the dev editor): nothing to show
  const look = presetLook(custom);
  const call = async (url: string, method: string, body?: object) => {
    setMsg("");
    const r = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) { setMsg(d.error || "That didn't work. Try again."); return null; }
    return d;
  };
  const save = async () => {
    const d = await call("/api/presets", "POST", { name: naming, styleId, custom: look });
    if (!d) return;
    setPresets((ps) => [...(ps ?? []).map((p) => (d.preset.isDefault ? { ...p, isDefault: false } : p)), d.preset]);
    setNaming(null);
  };
  const star = async (p: Preset) => {
    const d = await call(`/api/presets/${p.id}`, "PATCH", { isDefault: !p.isDefault });
    if (d) setPresets((ps) => ps!.map((x) => (x.id === p.id ? d.preset : d.preset.isDefault ? { ...x, isDefault: false } : x)));
  };
  const remove = async (p: Preset) => {
    if (!confirm(`Delete the preset "${p.name}"?`)) return;
    if (await call(`/api/presets/${p.id}`, "DELETE")) setPresets((ps) => ps!.filter((x) => x.id !== p.id));
  };
  return (
    <section className="presets" aria-label="My presets">
      <div className="insp-head">
        <h3>My presets</h3>
        {naming === null && <button className="btn ghost small" onClick={() => setNaming(`My look ${presets.length + 1}`)}>Save this look</button>}
      </div>
      {naming !== null && (
        <form className="preset-new" onSubmit={(e) => { e.preventDefault(); save(); }}>
          <input value={naming} onChange={(e) => setNaming(e.target.value)} maxLength={40} autoFocus aria-label="Preset name" onFocus={(e) => e.currentTarget.select()} />
          <button className="btn small" disabled={!naming.trim()}>Save</button>
          <button type="button" className="btn ghost small" onClick={() => setNaming(null)}>Cancel</button>
        </form>
      )}
      {presets.length ? (
        <div className="preset-list">
          {presets.map((p) => (
            <div key={p.id} className={`preset${p.styleId === styleId && same(p.custom, look) ? " on" : ""}`}>
              <button className="preset-use" onClick={() => onApply(p)} title={`Use "${p.name}" for this video`}>
                <b>{p.name}</b><small>{styleOf(p.styleId).name}{p.isDefault ? " · new videos" : ""}</small>
              </button>
              <button className="preset-star" aria-pressed={p.isDefault} onClick={() => star(p)} title={p.isDefault ? "Every new video starts with this look (tap to stop)" : "Start every new video with this look"}>★</button>
              <button className="preset-del" onClick={() => remove(p)} aria-label={`Delete ${p.name}`} title="Delete">×</button>
            </div>
          ))}
        </div>
      ) : naming === null && <p className="muted small">Save your style, colours, size and placement as a preset to use them again on any video. The ★ one is used for every new upload.</p>}
      {msg && <p className="error small">{msg}</p>}
    </section>
  );
}
