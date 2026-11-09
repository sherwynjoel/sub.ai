"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Price, PriceBook } from "@/lib/aiPrices";

const FIELDS = [
  ["audioM", "Audio in", "per 1M tokens"],
  ["inM", "Text in", "per 1M tokens"],
  ["outM", "Out", "per 1M tokens"],
  ["audioHour", "Audio", "per hour"],
  ["chars10k", "Text", "per 10k characters"],
] as const;

/** Edit each model's price and the dollar rate; models in use are listed first. */
export default function AiPriceForm({ book, used }: { book: PriceBook; used: string[] }) {
  const router = useRouter();
  const [prices, setPrices] = useState<Record<string, Price>>(book.prices);
  const [usdInr, setUsdInr] = useState(String(book.usdInr));
  const [add, setAdd] = useState("");
  const [msg, setMsg] = useState("");
  const names = [...new Set([...used, ...Object.keys(prices)])];
  const set = (model: string, f: keyof Price, v: string) =>
    setPrices((p) => ({ ...p, [model]: { ...(p[model] ?? { cur: "USD" }), [f]: f === "cur" ? v : v === "" ? undefined : Number(v) } as Price }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setMsg("Saving…");
    const res = await fetch("/api/admin/site", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "ai_prices", usdInr: Number(usdInr), prices }) });
    setMsg(res.ok ? "Saved." : (await res.json().catch(() => ({}))).error || "That didn't work.");
    if (res.ok) router.refresh();
  }

  return (
    <form onSubmit={save}>
      <p className="inline-form"><label>1 US dollar = ₹<input type="number" step="0.01" min="1" value={usdInr} onChange={(e) => setUsdInr(e.target.value)} style={{ width: 90 }} /></label></p>
      <div className="table-wrap"><table>
        <thead><tr><th>Model</th><th>Currency</th>{FIELDS.map(([f, l, u]) => <th key={f} className="num">{l}<div className="muted small">{u}</div></th>)}</tr></thead>
        <tbody>{names.map((m) => {
          const p = prices[m];
          return (
            <tr key={m}>
              <td>{m}{used.includes(m) && <span className="muted small"> · in use</span>}{!p && <div className="note warn small">No price</div>}</td>
              <td><select value={p?.cur ?? "USD"} onChange={(e) => set(m, "cur", e.target.value)} aria-label={`${m} currency`}><option value="USD">$</option><option value="INR">₹</option></select></td>
              {FIELDS.map(([f]) => (
                <td key={f} className="num"><input type="number" step="any" min="0" value={p?.[f] ?? ""} onChange={(e) => set(m, f, e.target.value)} aria-label={`${m} ${f}`} style={{ width: 80 }} /></td>
              ))}
            </tr>
          );
        })}</tbody>
      </table></div>
      <p className="inline-form">
        <label>Add a model<input value={add} onChange={(e) => setAdd(e.target.value)} placeholder="model name" style={{ width: 200 }} /></label>
        <button type="button" className="btn ghost small" onClick={() => { const n = add.trim(); if (n && !prices[n]) setPrices((p) => ({ ...p, [n]: { cur: "USD" } })); setAdd(""); }}>Add</button>
      </p>
      <p className="btn-row"><button className="btn small">Save prices</button>{msg && <span className="muted small">{msg}</span>}</p>
    </form>
  );
}
