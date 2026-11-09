import Link from "next/link";
import AiPriceForm from "@/components/admin/AiPriceForm";
import { when } from "@/lib/admin";
import { aiCostStats, jobNames } from "@/lib/aiPrices";
import { getAiConfig } from "@/lib/ai";

const monthName = (m: string) => new Date(`${m}-01T00:00:00`).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
/** ₹ with paise when small: AI costs per minute are often under ₹1. */
const rs = (n: number | null | undefined) => (n == null ? "—" : n < 100 ? `₹${n.toFixed(2)}` : "₹" + Math.round(n).toLocaleString("en-IN"));
const mins = (sec: number) => (sec < 60 ? `${Math.round(sec)} s` : `${(sec / 60).toFixed(sec < 600 ? 1 : 0)} min`);
const nOf = (n: number, w: string) => `${n} ${w}${n === 1 ? "" : "s"}`;
const big = (n: number) => (n >= 1e6 ? `${(n / 1e6).toFixed(2)}M` : n >= 1e3 ? `${(n / 1e3).toFixed(1)}k` : String(Math.round(n)));

/** What the AI really costs: measured from every call (tokens, audio, characters) and priced with the list below. */
export default async function AiCost() {
  const [s, cfg] = await Promise.all([aiCostStats(), getAiConfig()]);
  const names = await jobNames(s.recent.map((r) => r.jobId).filter((x): x is string => !!x));
  const thisMonth = s.months.at(-1)!, lastMonth = s.months.at(-2)!;
  const last30 = s.recent; // shown below
  const used = [...new Set([...s.models.map((m) => m.model), cfg.model, ...(cfg.sttModel ? [cfg.sttModel] : [])])];

  return (
    <>
      <h1>AI cost</h1>
      <p className="muted">
        Measured from every AI call: what the service reports it used (Gemini tokens, seconds of audio, characters translated), priced with the list at the bottom.
        {s.since ? <> Measuring since {when(s.since)}.</> : <> Nothing measured yet: the first video made from now on shows up here.</>}
        {" "}Now using <b>{cfg.provider}</b> · {cfg.model}{cfg.sttModel ? ` + ${cfg.sttModel}` : ""} (<Link href="/admin/server">change</Link>).
      </p>
      {s.unpriced.length > 0 && <p className="note warn">No price set for {s.unpriced.join(", ")}: counted as ₹0. Add it below.</p>}

      <dl className="stats">
        <div className="stat"><dt>Cost per minute, this month</dt><dd>{rs(thisMonth.perMin)}</dd><span className="sub">Subtitles · {mins(thisMonth.subtitles.sec)} of video</span></div>
        <div className="stat"><dt>Cost per minute, last month</dt><dd>{rs(lastMonth.perMin)}</dd><span className="sub">{nOf(lastMonth.subtitles.runs, "video")}</span></div>
        <div className="stat"><dt>AI cost, this month</dt><dd>{rs(thisMonth.total)}</dd><span className="sub">{nOf(thisMonth.subtitles.runs, "video")}{thisMonth.translate.runs ? `, ${nOf(thisMonth.translate.runs, "translation")}` : ""}</span></div>
        <div className="stat"><dt>Translation, per minute</dt><dd>{rs(thisMonth.translatePerMin)}</dd><span className="sub">This month · {rs(thisMonth.translate.cost)} in all</span></div>
      </dl>

      <div className="two-col">
        <section className="panel">
          <h2>By month</h2>
          <div className="table-wrap"><table>
            <thead><tr><th>Month</th><th className="num">Videos</th><th className="num">Minutes</th><th className="num">Subtitles</th><th className="num">Translations</th><th className="num">Total</th><th className="num">Per minute</th></tr></thead>
            <tbody>{[...s.months].reverse().filter((r) => r.subtitles.runs + r.translate.runs > 0 || r === thisMonth).map((r) => (
              <tr key={r.m}><td>{monthName(r.m)}</td><td className="num">{r.subtitles.runs}</td><td className="num">{Math.round(r.subtitles.sec / 60)}</td>
                <td className="num">{rs(r.subtitles.cost)}</td><td className="num">{r.translate.runs ? rs(r.translate.cost) : "—"}</td><td className="num">{rs(r.total)}</td><td className="num"><b>{rs(r.perMin)}</b></td></tr>
            ))}</tbody>
          </table></div>
        </section>
        <section className="panel">
          <h2>By model, this month</h2>
          {s.models.length === 0 ? <p className="muted">Nothing yet this month.</p> : (
            <div className="table-wrap"><table>
              <thead><tr><th>Model</th><th>Used</th><th className="num">Cost</th></tr></thead>
              <tbody>{s.models.map((m) => (
                <tr key={`${m.kind}${m.model}`}><td>{m.model}<div className="muted small">{m.provider} · {m.kind}</div></td>
                  <td className="small">{[m.sums.audioSec ? `${mins(m.sums.audioSec)} audio` : "", m.sums.audioTok ? `${big(m.sums.audioTok)} audio tokens` : "", m.sums.inTok ? `${big(m.sums.inTok)} text in` : "", m.sums.outTok ? `${big(m.sums.outTok)} out` : "", m.sums.chars ? `${big(m.sums.chars)} characters` : ""].filter(Boolean).join(" · ")}</td>
                  <td className="num">{rs(m.cost)}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </section>
      </div>

      <section className="panel">
        <h2>Latest videos</h2>
        {last30.length === 0 ? <p className="muted">None measured yet.</p> : (
          <div className="table-wrap"><table>
            <thead><tr><th>When</th><th>Video</th><th>What</th><th>AI</th><th className="num">Length</th><th className="num">Cost</th><th className="num">Per minute</th></tr></thead>
            <tbody>{last30.map((r, i) => (
              <tr key={i}><td>{when(r.at)}</td><td>{r.jobId ? names.get(r.jobId) ?? <span className="muted">deleted</span> : "—"}</td><td>{r.kind === "translate" ? "Translation" : "Subtitles"}</td>
                <td>{r.providers}</td><td className="num">{mins(r.videoSec)}</td><td className="num">{rs(r.cost)}</td><td className="num">{rs(r.perMin)}</td></tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <section className="panel">
        <h2>Prices</h2>
        <p className="muted small">
          List prices per unit, in the currency the service bills in. Change one when the service changes its price; the figures above update straight away
          (past ones too). Remaining credit isn&apos;t shown: Gemini and Sarvam don&apos;t give a balance to apps. Check it on their dashboards
          (<a href="https://aistudio.google.com/usage" target="_blank" rel="noreferrer">Google AI Studio</a>, <a href="https://dashboard.sarvam.ai" target="_blank" rel="noreferrer">Sarvam</a>).
        </p>
        <AiPriceForm book={s.book} used={used} />
      </section>
    </>
  );
}
