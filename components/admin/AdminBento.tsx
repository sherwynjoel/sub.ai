/* eslint-disable @typescript-eslint/ban-ts-comment -- the charts are plain DOM + SVG (see below), checked as JavaScript */
// @ts-nocheck
"use client";
/* The charts are drawn with plain DOM + SVG inside an effect (as in the design this follows), so this file is
   checked as JavaScript. No dependencies. */

import * as React from "react";
import type { Dashboard } from "@/lib/admin";

/* ------------------------------------------------------------------ */
/*  The admin dashboard: users over time (trial / paying), users by   */
/*  plan, total and active users, subscriptions and revenue, system   */
/*  health, sign-ups vs projects, recent payments, this week's        */
/*  sign-ups. Design after vasnev.art's Finance Bento (21st.dev):      */
/*  the cards, dot numbers, stream, gauge, waves and capsules.        */
/* ------------------------------------------------------------------ */

const CSS = `.adb{font-family:var(--font-sans),ui-sans-serif,system-ui,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;width:100%;margin:0 0 28px}
.adb *{box-sizing:border-box}
.adb{--acc:#E8FF1F;--t1:#fff;--t2:rgba(255,255,255,.56);--t3:rgba(255,255,255,.38);--hair:rgba(255,255,255,.14);--ease:cubic-bezier(.32,.72,0,1);--mono:ui-monospace,SFMono-Regular,Menlo,monospace}
.adb .adb-c{position:relative;padding:20px 22px 22px;background:#000;color:#fff;border-radius:28px}
.adb .top{display:flex;align-items:center;gap:14px;height:44px;margin-bottom:16px}
.adb .top h2{margin:0;font-size:26px;font-weight:700;letter-spacing:-.03em;flex:1;color:#fff}
.adb .top h2 span{font-weight:500;color:var(--t3);font-size:14px;letter-spacing:-.01em;margin-left:12px}
.adb .seg{display:flex;padding:3px;gap:2px;border-radius:14px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12)}
.adb .seg button{border:0;height:28px;min-width:44px;padding:0 12px;border-radius:11px;background:transparent;color:var(--t2);font:600 12.5px var(--font-sans),sans-serif;cursor:pointer;transition:background .25s,color .25s}
.adb .seg button[aria-pressed="true"]{background:#fff;color:#0b0b0c}
.adb .seg button:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.adb .grid{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:14px}
.adb .h1{height:376px}.adb .h2{height:168px}.adb .h3{height:330px}
.adb #us{grid-column:span 8}.adb #plans{grid-column:span 4}.adb .kpi{grid-column:span 3}
.adb #flow{grid-column:span 5}.adb #pays{grid-column:span 4}.adb #week{grid-column:span 3}
@media (max-width:1199px){.adb #us{grid-column:span 12}.adb #plans{grid-column:span 6;grid-row:span 2;height:auto}.adb .kpi{grid-column:span 6}.adb #flow{grid-column:span 12}.adb #pays,.adb #week{grid-column:span 6}}
@media (max-width:767px){.adb .adb-c{padding:16px 14px}.adb .top{flex-wrap:wrap;height:auto;gap:12px}.adb .top h2{font-size:22px}.adb .top h2 span{display:block;margin:4px 0 0}
.adb #us{height:420px}.adb #us .legend{flex:1 0 100%;order:3;margin-top:8px}.adb #us .hrow{flex-wrap:wrap}.adb #us .nrow{flex-wrap:wrap;gap:6px 16px}
.adb #plans{grid-column:span 12;grid-row:auto;height:376px}.adb .kpi{grid-column:span 6}.adb #pays,.adb #week{grid-column:span 12}.adb .grid{gap:12px}}
@media (max-width:520px){.adb .kpi{grid-column:span 12}}
.adb .card{position:relative;border-radius:28px;overflow:hidden;opacity:0;transform:translateY(14px) scale(.985);transition:opacity .7s ease,transform .9s var(--ease)}
.adb .in .card{opacity:1;transform:none}
.adb .card .rim{position:absolute;inset:0;border-radius:inherit;box-shadow:inset 0 1px 0 rgba(255,255,255,.2),inset 0 0 0 1px rgba(255,255,255,.06);pointer-events:none;z-index:9}
.adb .g{position:absolute;inset:0}
.adb .core{position:absolute;left:10%;right:10%;top:16%;bottom:-6%;border-radius:90px;filter:blur(60px)}
.adb .glass{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);backdrop-filter:blur(20px)}
.adb .in-c{position:absolute;inset:0;padding:22px 24px;z-index:2}
.adb .ttl{font-size:18px;font-weight:600;letter-spacing:-.02em;display:flex;align-items:center;gap:8px}
.adb .cap{white-space:nowrap;font-size:11.5px;font-weight:600;letter-spacing:.06em;text-transform:uppercase;color:var(--t2)}
.adb .big{font-size:40px;font-weight:200;letter-spacing:-.04em;line-height:1;font-variant-numeric:tabular-nums}
.adb .delta{font:600 12.5px var(--mono);color:var(--acc);letter-spacing:-.02em}
.adb .muted{font-size:12.5px;color:var(--t3);font-weight:500;letter-spacing:-.01em}
.adb .chip{white-space:nowrap;flex:none;display:inline-flex;align-items:center;height:22px;padding:0 9px;border-radius:11px;background:rgba(0,0,0,.85);color:#fff;font:600 11px var(--mono);letter-spacing:-.02em}
.adb .legend{display:flex;gap:16px;font-size:12px;font-weight:500;color:var(--t2)}
.adb .legend span{display:inline-flex;align-items:center;gap:6px}.adb .legend i{width:8px;height:8px;border-radius:50%}
.adb .row{display:flex;align-items:center;gap:12px}
.adb .mono{font-family:var(--mono);font-variant-numeric:tabular-nums}
.adb .dots circle{transition:opacity .26s,transform .26s;transform-box:fill-box;transform-origin:center}
.adb .tip{position:fixed;z-index:50;pointer-events:none;background:rgba(14,14,16,.92);color:#fff;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:9px 11px;font-size:12px;
  backdrop-filter:blur(16px);box-shadow:0 12px 30px -10px rgba(0,0,0,.6);opacity:0;transform:translateY(4px);transition:opacity .15s,transform .15s;white-space:nowrap;min-width:150px}
.adb .tip.on{opacity:1;transform:none}.adb .tip .t{color:var(--t2);margin-bottom:5px;font-weight:500}
.adb .tip .r{display:flex;justify-content:space-between;gap:14px;align-items:center;line-height:19px}.adb .tip .r span{display:inline-flex;align-items:center;gap:6px;color:var(--t2)}
.adb .tip i{width:7px;height:7px;border-radius:50%}.adb .tip b{font:500 12px var(--mono)}
.adb .st-dot{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px}
@media (prefers-reduced-motion: reduce){.adb .card{transition:none}}`;

const markup = (at) => `<div class="adb-c">
  <div class="top"><h2>Dashboard<span>Updated ${new Date(at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}</span></h2>
    <div class="seg" id="period" role="group" aria-label="Period"></div></div>
  <div class="grid" id="grid">
    <section class="card h1" id="us" aria-label="Users over time"></section>
    <section class="card h1" id="plans" aria-label="Users by plan"></section>
    <section class="card h2 kpi" id="tot" aria-label="Total users"></section>
    <section class="card glass h2 kpi" id="act" aria-label="Active users"></section>
    <section class="card glass h2 kpi" id="subs" aria-label="Subscriptions"></section>
    <section class="card glass h2 kpi" id="health" aria-label="System"></section>
    <section class="card h3" id="flow" aria-label="Sign-ups and projects"></section>
    <section class="card h3" id="pays" aria-label="Payments"></section>
    <section class="card h3" id="week" aria-label="Sign-ups this week"></section>
  </div></div><div class="tip" id="tip"></div>`;

function mount(root, data) {
  let alive = true;
  const frames = new Set();
  const RAF = (cb) => { if (!alive) return 0; const id = requestAnimationFrame((t) => { frames.delete(id); if (alive) cb(t); }); frames.add(id); return id; };
  const $id = (id) => root.querySelector("#" + id);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const ACC = "#E8FF1F", T2 = "rgba(255,255,255,.56)", T3 = "rgba(255,255,255,.38)", HAIR = "rgba(255,255,255,.14)";
  const COL = { trial: "#FFFFFF", paid: "#A9B2FF", free: "rgba(255,255,255,.9)", creator: "#A9B2FF", pro: "#FFB37A", studio: ACC };
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const NS = "http://www.w3.org/2000/svg";
  const el = (t, a = {}, p) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); if (p) p.appendChild(e); return e; };
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  const num = (v) => Math.round(v).toLocaleString("en-IN");
  const inr = (v) => "₹" + Math.round(v).toLocaleString("en-IN");
  const S = { period: "1M" };
  const DAY = 864e5;

  /* ---------- users over time: cumulative sign-ups, trial vs paying now ---------- */
  const first = data.days.length ? new Date(data.days[0].d) : new Date(data.at);
  const today = new Date(data.at.slice(0, 10));
  const daily = []; // cumulative, every day from the first sign-up (or a month before today) to today
  { const start = new Date(Math.min(first.getTime(), today.getTime() - 400 * DAY)), by = new Map(data.days.map((x) => [x.d, x]));
    let trial = 0, paid = 0;
    for (let t = start.getTime(); t <= today.getTime(); t += DAY) { const d = new Date(t), k = d.toISOString().slice(0, 10), v = by.get(k); if (v) { trial += v.trial; paid += v.paid; } daily.push({ d, trial, paid }); } }
  const pick = (n, stepDays) => { const out = []; for (let k = n - 1; k >= 0; k--) { const i = Math.max(0, daily.length - 1 - k * stepDays); out.push(daily[i]); } return out; };
  function series() {
    const fmt = (o, opt) => ({ ...o, l: o.d.toLocaleDateString("en-IN", opt) });
    if (S.period === "1M") return pick(31, 1).map((o) => fmt(o, { day: "numeric", month: "short" }));
    if (S.period === "3M") return pick(14, 7).map((o) => fmt(o, { day: "numeric", month: "short" }));
    if (S.period === "1Y") return pick(13, 30).map((o) => fmt(o, { month: "short" }));
    const months = Math.max(2, Math.ceil((today - first) / (30 * DAY)) + 1);
    return pick(Math.min(months, 37), 30).map((o) => fmt(o, { month: "short", year: "2-digit" }));
  }
  const total = (p) => p.trial + p.paid;

  /* ---------- helpers (as in the design) ---------- */
  const bg = ({ top, base, bottom, core }) => `<div class="g" style="background:linear-gradient(180deg,${top} 0%,${base} 36%,${base} 74%,${bottom} 100%)"></div><div class="core" style="background:${core}"></div>`;
  const GR = {
    blue: { top: "#b9a6ff", base: "#2e43ff", bottom: "#6d7dff", core: "#05082a" },
    graph: { top: "#9a9aa8", base: "#3a3a44", bottom: "#55555f", core: "#060608" },
    pink: { top: "#ffb3d6", base: "#ff2a85", bottom: "#ff6aa8", core: "#3a031c" },
    copper: { top: "#f6bf96", base: "#c2683a", bottom: "#dc8a5c", core: "#1d0b05" },
    green: { top: "#a6e8c8", base: "#36956f", bottom: "#58b58c", core: "#061d15" },
    lime: { top: "#f4ffb8", base: "#a3c400", bottom: "#c9e03a", core: "#121700" },
  };
  function smoothPath(P, move = true) { let d = (move ? "M" : "L") + `${P[0][0]},${P[0][1]}`; for (let i = 0; i < P.length - 1; i++) { const p0 = P[i - 1] || P[i], p1 = P[i], p2 = P[i + 1], p3 = P[i + 2] || p2, k = 0.17;
    d += `C${p1[0] + (p2[0] - p0[0]) * k},${p1[1] + (p2[1] - p0[1]) * k} ${p2[0] - (p3[0] - p1[0]) * k},${p2[1] - (p3[1] - p1[1]) * k} ${p2[0]},${p2[1]}`; } return d; }
  const P2 = (r, a) => [r * Math.cos(a * Math.PI / 180), r * Math.sin(a * Math.PI / 180)];
  const F = { "0": ["01110","10001","10011","10101","11001","10001","01110"], "1": ["00100","01100","00100","00100","00100","00100","01110"], "2": ["01110","10001","00001","00010","00100","01000","11111"], "3": ["11111","00010","00100","00010","00001","10001","01110"], "4": ["00010","00110","01010","10010","11111","00010","00010"], "5": ["11111","10000","11110","00001","00001","10001","01110"], "6": ["00110","01000","10000","11110","10001","10001","01110"], "7": ["11111","00001","00010","00100","01000","01000","01000"], "8": ["01110","10001","10001","01110","10001","10001","01110"], "9": ["01110","10001","10001","01111","00001","00010","01100"], ",": ["0","0","0","0","0","1","1"], " ": ["00","00","00","00","00","00","00"] };
  function DotNumber(host, pitch) {
    const cols = 48, svg = el("svg", { class: "dots", "aria-hidden": "true" }, host), cells = [];
    for (let c = 0; c < cols; c++) for (let r = 0; r < 7; r++) { const ci = el("circle", { cx: c * pitch + pitch / 2, cy: r * pitch + pitch / 2, r: pitch * 0.36, fill: "#fff", opacity: 0 }, svg); ci.style.transitionDelay = c * 7 + "ms"; cells.push([c, r, ci]); }
    const set = (t) => { const on = new Set(); let x = 0; for (const ch of t) { const g = F[ch] || F[" "]; const w = g[0].length; for (let r = 0; r < 7; r++) for (let k = 0; k < w; k++) if (g[r][k] === "1") on.add((x + k) * 8 + r); x += w + 1; }
      const used = Math.max(1, x - 1); for (const [c, r, ci] of cells) { const v = on.has(c * 8 + r); ci.setAttribute("opacity", v ? 1 : c < used ? 0.08 : 0); ci.style.transform = v ? "none" : "scale(.55)"; }
      svg.setAttribute("width", used * pitch); svg.setAttribute("height", 7 * pitch); svg.setAttribute("viewBox", `0 0 ${used * pitch} ${7 * pitch}`); };
    let raf = 0, cur = 0;
    return { count(to, dur = 900) { cancelAnimationFrame(raf); const from = cur, t0 = performance.now(); let last = "";
      const f = (now) => { const t = reduce ? 1 : Math.min(1, (now - t0) / dur); cur = from + (to - from) * ease(t); const s = Math.round(cur).toLocaleString("en-IN"); if (s !== last) { set(s); last = s; } if (t < 1) raf = RAF(f); }; raf = RAF(f); } };
  }
  function tween(node, to, fmt, dur = 900) { const from = +node.dataset.v || 0, t0 = performance.now(); node.dataset.v = to;
    (function f(now) { const t = reduce ? 1 : Math.min(1, (now - t0) / dur); node.textContent = fmt(from + (to - from) * ease(t)); if (t < 1) RAF(f); })(t0); }
  const tip = $id("tip");
  function showTip(x, y, title, rows) { tip.innerHTML = `<div class="t">${esc(title)}</div>` + rows.map(([k, v, c]) => `<div class="r"><span>${c ? `<i style="background:${c}"></i>` : ""}${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
    tip.classList.add("on"); const r = tip.getBoundingClientRect(); let L = x + 16, T = y - r.height - 14; if (L + r.width > innerWidth - 8) L = x - r.width - 16; if (T < 8) T = y + 16; tip.style.left = L + "px"; tip.style.top = T + "px"; }
  const hideTip = () => tip.classList.remove("on");
  const PERIOD_WORDS = { "1M": "this month", "3M": "in 3 months", "1Y": "this year", All: "since launch" };

  /* ---- Users over time: a stream of trial and paying users ---- */
  const us = $id("us");
  us.innerHTML = `${bg(GR.blue)}<div class="in-c">
    <div class="row hrow" style="justify-content:space-between"><div class="ttl">Users</div>
      <div class="legend"><span><i style="background:${COL.trial}"></i>Free trial</span><span><i style="background:${COL.paid}"></i>Paying</span></div></div>
    <div class="row nrow" style="margin-top:16px;align-items:flex-end;gap:16px"><div class="usn"></div>
      <div style="padding-bottom:6px"><div class="delta usd"></div><div class="muted usc" style="margin-top:3px"></div></div></div>
    <svg class="uss" style="position:absolute;left:0;right:0;bottom:0;display:block" aria-hidden="true"></svg></div><div class="rim"></div>`;
  const usNum = DotNumber(us.querySelector(".usn"), innerWidth < 520 ? 5.4 : 7);
  let usGrow = 0, usRaf = 0, usData = null;
  function drawUsers() {
    const svg = us.querySelector(".uss"), W = us.clientWidth, Hh = 226, top = 26, bot = 26, mid = top + (Hh - top - bot) / 2;
    svg.setAttribute("width", W); svg.setAttribute("height", Hh); svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
    const D = usData, n = D.length, tots = D.map(total), mx = Math.max(1, ...tots), half = (Hh - top - bot) / 2;
    const k = (p) => (total(p) ? (Math.max(total(p), mx * 0.04) / mx) * half * 2 / total(p) : 0);
    const X = (i) => -20 + (i / (n - 1)) * (W + 40);
    const g = ease(usGrow);
    const lay = D.map((p) => { const q = (k(p) * g) / 2, t = p.trial * q, pd = p.paid * q; return { t: Math.max(t, 0.6), tp: Math.max(t + pd, 0.6) }; });
    const band = (key) => { const T = D.map((p, i) => [X(i), mid - lay[i][key]]), B = D.map((p, i) => [X(i), mid + lay[i][key]]).reverse(); return smoothPath(T) + smoothPath(B, false) + "Z"; };
    const marks = [Math.round((n - 1) * 0.18), Math.round((n - 1) * 0.55), n - 1];
    svg.innerHTML = `<defs><linearGradient id="usf" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".25" stop-color="#fff" stop-opacity="1"/></linearGradient>
        <mask id="usm"><rect width="${W}" height="${Hh}" fill="url(#usf)"/></mask></defs>
      <g mask="url(#usm)"><path d="${band("tp")}" fill="${COL.paid}"/><path d="${band("t")}" fill="${COL.trial}" opacity=".95"/></g>
      ${marks.map((i, j) => { const x = Math.min(W - 36, Math.max(36, X(i))); return `<g style="opacity:${g > 0.6 ? 1 : 0};transition:opacity .4s ${j * 0.08}s">
        <line x1="${x}" x2="${x}" y1="${top - 4}" y2="${Hh - bot + 4}" stroke="rgba(0,0,0,.55)" stroke-width="1.5"/>
        <rect x="${x - 34}" y="${top - 14}" width="68" height="22" rx="11" fill="#000"/><text x="${x}" y="${top + 1}" text-anchor="middle" font-size="11" font-weight="600" fill="#fff" font-family="ui-monospace,Menlo,monospace">${num(total(D[i]))}</text>
        <rect x="${x - 30}" y="${Hh - bot - 8}" width="60" height="22" rx="11" fill="#000"/><text x="${x}" y="${Hh - bot + 7}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.7)" font-family="ui-monospace,Menlo,monospace">${esc(D[i].l)}</text></g>`; }).join("")}
      <line class="hl" y1="${top}" y2="${Hh - bot}" stroke="#fff" stroke-width="1.5" opacity="0"/>
      <rect width="${W}" height="${Hh}" fill="transparent" class="hit"/>`;
    const hit = svg.querySelector(".hit"), hl = svg.querySelector(".hl");
    hit.onpointermove = (e) => { const r = svg.getBoundingClientRect(), z = r.width / W, x = (e.clientX - r.left) / z; const i = Math.max(0, Math.min(n - 1, Math.round(((x + 20) / (W + 40)) * (n - 1)))); const p = D[i];
      hl.setAttribute("x1", X(i)); hl.setAttribute("x2", X(i)); hl.setAttribute("opacity", 1);
      showTip(r.left + X(i) * z, r.top + (mid - lay[i].tp) * z, p.l, [["Paying", num(p.paid), COL.paid], ["Free trial", num(p.trial), COL.trial], ["Total", num(total(p))]]); };
    hit.onpointerleave = () => { hl.setAttribute("opacity", 0); hideTip(); };
  }
  function updateUsers() {
    usData = series(); const D = usData, a = total(D[0]), b = total(D[D.length - 1]);
    usNum.count(b);
    us.querySelector(".usd").textContent = a ? (b >= a ? "↑ " : "↓ ") + Math.abs(((b - a) / a) * 100).toFixed(1) + "%" : b ? "↑ new" : "—";
    us.querySelector(".usc").textContent = (b >= a ? "+" : "−") + num(Math.abs(b - a)) + " users " + PERIOD_WORDS[S.period];
    cancelAnimationFrame(usRaf); const t0 = performance.now(); usGrow = 0;
    const f = (now) => { usGrow = reduce ? 1 : Math.min(1, (now - t0) / 1100); drawUsers(); if (usGrow < 1) usRaf = RAF(f); }; usRaf = RAF(f);
  }

  /* ---- Users by plan: a half gauge of tick marks ---- */
  const pl = $id("plans");
  pl.innerHTML = `${bg(GR.graph)}<div class="in-c">
    <div class="row" style="justify-content:space-between"><div class="ttl">Plans</div><span class="chip" style="background:rgba(255,255,255,.12)">${num(data.total)} users</span></div>
    <svg class="plg" width="300" height="168" viewBox="-150 -150 300 168" style="position:absolute;left:50%;margin-left:-150px;top:70px" aria-hidden="true"></svg>
    <div class="pll" style="position:absolute;left:24px;right:24px;bottom:16px"></div></div><div class="rim"></div>`;
  function updatePlans() {
    const B = data.byPlan, t = Math.max(1, B.free + B.creator + B.pro + B.studio);
    const order = [["studio", "Studio"], ["pro", "Pro"], ["creator", "Creator"], ["free", "Free trial"]];
    const fr = Object.fromEntries(order.map(([k]) => [k, B[k] / t]));
    const n = 56, svg = pl.querySelector(".plg"); let s = "", acc = 0;
    const edges = order.map(([k]) => (acc += fr[k]));
    for (let i = 0; i <= n; i++) { const f = i / n, a = 180 + f * 180, j = edges.findIndex((e) => f <= e + 1e-9), cls = order[j < 0 ? 3 : j][0];
      const [x1, y1] = P2(136, a), [x2, y2] = P2(i % 7 === 0 ? 112 : 118, a);
      s += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${COL[cls]}" stroke-opacity="${cls === "free" ? 0.35 : 1}" stroke-width="3.2" stroke-linecap="round" style="opacity:0;animation:tk .4s ${i * 12}ms forwards"/>`; }
    const paying = Math.round((1 - fr.free) * 100);
    s += `<text y="-22" text-anchor="middle" font-weight="200" font-size="52" fill="#fff" letter-spacing="-2">${paying}<tspan font-size="17" dy="-24" fill="${T2}">%</tspan></text><text y="0" text-anchor="middle" font-size="12" font-weight="500" fill="${T3}">paying</text>`;
    svg.innerHTML = `<style>@keyframes tk{to{opacity:1}}</style>` + s;
    pl.querySelector(".pll").innerHTML = order.slice().reverse().map(([k, label], i) =>
      `<div class="row" style="height:28px;${i ? "border-top:1px solid rgba(255,255,255,.1)" : ""}"><i style="width:8px;height:8px;border-radius:50%;background:${COL[k]}"></i><span style="flex:1;font-size:13px;font-weight:600">${label}</span><span class="mono muted" style="width:44px;text-align:right">${Math.round(fr[k] * 100)}%</span><span class="mono" style="width:56px;text-align:right;font-size:13px">${num(B[k])}</span></div>`).join("");
  }

  /* ---- KPI: total users (the accent tile) ---- */
  const tot = $id("tot");
  const new7 = data.week.reduce((a, x) => a + x.n, 0);
  tot.innerHTML = `${bg(GR.lime)}<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap" style="color:rgba(0,0,0,.6)">Total users</div><span class="chip">+${num(new7)} · 7 days</span></div>
    <div style="position:absolute;left:22px;bottom:32px;display:flex;align-items:center;gap:8px"><svg width="30" height="36" viewBox="0 0 34 40" aria-hidden="true"><path d="M17 37V5M5 17L17 5l12 12" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>
      <span class="big ttv" style="font-size:52px">0</span></div>
    <div class="muted ttp" style="position:absolute;left:24px;bottom:14px;font-size:11.5px;color:rgba(0,0,0,.55)"></div></div><div class="rim"></div>`;
  function updateTotal() { tween(tot.querySelector(".ttv"), data.total, (v) => num(v));
    const D = usData, grew = total(D[D.length - 1]) - total(D[0]);
    tot.querySelector(".ttp").textContent = `+${num(grew)} ${PERIOD_WORDS[S.period]} · ${num(data.byPlan.free)} on the free trial`; }

  /* ---- KPI: active users, with ticks for the share of all users ---- */
  const act = $id("act");
  act.innerHTML = `<div class="in-c"><div class="row" style="justify-content:space-between"><div class="cap">Active users</div><span class="muted">made a project</span></div>
    <div class="row" style="margin-top:14px;align-items:baseline;justify-content:space-between"><span class="big acv" style="font-size:38px">0</span><span class="mono" style="font-size:20px;font-weight:500"><span class="ac7">0</span><span class="muted" style="font-size:12px"> in 7 days</span></span></div>
    <svg class="act" width="100%" height="22" style="position:absolute;left:24px;right:24px;bottom:22px;width:calc(100% - 48px)" aria-hidden="true"></svg></div>`;
  function updateActive() { tween(act.querySelector(".acv"), data.active30, (x) => num(x)); tween(act.querySelector(".ac7"), data.active7, (x) => num(x));
    const svg = act.querySelector(".act"), W = svg.getBoundingClientRect().width || 220, n = 36, share = data.total ? data.active30 / data.total : 0; let s = "";
    for (let i = 0; i < n; i++) { const x = 1 + (i * (W - 2)) / (n - 1), on = i / (n - 1) <= share && share > 0; s += `<line x1="${x}" x2="${x}" y1="${i % 6 === 0 ? 2 : 8}" y2="20" stroke="${on ? ACC : "rgba(255,255,255,.28)"}" stroke-width="1.6" stroke-linecap="round" style="transition:stroke .2s ${i * 14}ms"/>`; }
    svg.innerHTML = s + `<text x="${W}" y="0" dy="-4" text-anchor="end" font-size="10" fill="${T3}" font-family="ui-monospace,Menlo,monospace">${Math.round(share * 100)}% of users · 30 days</text>`; }

  /* ---- KPI: subscriptions and revenue ---- */
  const subs = $id("subs");
  subs.innerHTML = `<div class="in-c" style="padding-bottom:14px"><div class="row" style="justify-content:space-between"><div class="cap">Subscriptions</div><span class="mono muted">${inr(data.mrr)}/mo</span></div>
    <div style="margin-top:10px">${[["Paying users", num(data.paid)], ["Monthly revenue", inr(data.mrr)], ["Collected · 30 days", inr(data.revenue30d)]].map(([k, v], i) =>
      `<div class="row" style="height:34px;${i ? "border-top:1px solid rgba(255,255,255,.08)" : ""}"><span style="flex:1;font-size:13px;font-weight:600">${k}</span><span class="mono" style="font-size:13px">${v}</span></div>`).join("")}</div></div>`;

  /* ---- KPI: system health ---- */
  const health = $id("health");
  health.innerHTML = `<div class="in-c" style="padding-bottom:14px"><div class="row" style="justify-content:space-between"><div class="cap">System</div><span class="muted">${num(data.jobsToday)} projects today</span></div>
    <div style="margin-top:10px">${[["Worker", `<span class="st-dot" style="background:${data.worker ? ACC : "#ff5a5a"}"></span>${data.worker ? "Running" : "Stopped"}`], ["Waiting in queue", num(data.queued)], ["Failed today", num(data.failedToday)], ["Minutes · 30 days", num(data.minutes30d)]].map(([k, v], i) =>
      `<div class="row" style="height:27px;${i ? "border-top:1px solid rgba(255,255,255,.08)" : ""}"><span style="flex:1;font-size:12.5px;font-weight:600">${k}</span><span class="mono" style="font-size:12.5px">${v}</span></div>`).join("")}</div></div>`;

  /* ---- Sign-ups (above) and projects (below), month by month ---- */
  const flow = $id("flow");
  const M = data.months, MLAB = M.map((x) => new Date(x.m + "-01").toLocaleDateString("en-IN", { month: "short" }));
  const SIG = M.map((x) => x.signups), PRJ = M.map((x) => x.projects);
  flow.innerHTML = `${bg(GR.pink)}<div class="in-c">
    <div class="row" style="justify-content:space-between"><div><div class="ttl">Growth</div><div class="muted" style="margin-top:4px">This month <span class="mono" style="color:${ACC}">${num(SIG[SIG.length - 1])} sign-ups · ${num(PRJ[PRJ.length - 1])} projects</span></div></div>
      <div class="legend" style="flex-direction:column;gap:4px;align-items:flex-end"><span><i style="background:#fff"></i>Sign-ups</span><span><i style="background:#FFD0E6"></i>Projects</span></div></div>
    <svg class="fls" style="position:absolute;left:0;bottom:12px" aria-hidden="true"></svg></div><div class="rim"></div>`;
  let flowRaf = 0;
  function updateFlow(instant) {
    const svg = flow.querySelector(".fls"), W = flow.clientWidth, Hh = 246, L = 44, R = W - 36, mid = Hh / 2, lab = 16, amp = mid - lab - 8;
    const top = Math.max(1, ...SIG, ...PRJ), step = Math.max(1, Math.ceil(top / 3)), max = step * 3;
    svg.setAttribute("width", W); svg.setAttribute("height", Hh); svg.setAttribute("viewBox", `0 0 ${W} ${Hh}`);
    const X = (i) => L + (i / (MLAB.length - 1)) * (R - L);
    cancelAnimationFrame(flowRaf); const t0 = instant ? -1e6 : performance.now();
    const frame = (now) => { const g = ease(reduce ? 1 : Math.min(1, (now - t0) / 1200));
      const path = (arr, dir) => smoothPath(arr.map((v, i) => [X(i), mid + dir * (lab + (v / max) * amp * g)]));
      let s = "";
      [0, step, step * 2, step * 3].forEach((v) => { const yT = mid - lab - (v / max) * amp, yB = mid + lab + (v / max) * amp;
        s += `<line x1="${L}" x2="${R}" y1="${yT}" y2="${yT}" stroke="${HAIR}"/><line x1="${L}" x2="${R}" y1="${yB}" y2="${yB}" stroke="${HAIR}"/>
          <text x="${L - 12}" y="${yT + 3.5}" text-anchor="end" font-size="10" fill="${T3}" font-family="ui-monospace,Menlo,monospace">${num(v)}</text><text x="${L - 12}" y="${yB + 3.5}" text-anchor="end" font-size="10" fill="${T3}" font-family="ui-monospace,Menlo,monospace">${num(v)}</text>`; });
      MLAB.forEach((m, i) => (s += `<text x="${X(i)}" y="${mid + 4}" text-anchor="middle" font-size="10.5" font-weight="500" fill="rgba(255,255,255,.75)" font-family="ui-monospace,Menlo,monospace">${m}</text>`));
      s += `<path d="${path(SIG, -1)}" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/><path d="${path(PRJ, 1)}" fill="none" stroke="#FFD0E6" stroke-width="2.4" stroke-linecap="round"/>`;
      s += `<line class="hl" y1="10" y2="${Hh - 10}" stroke="#fff" stroke-opacity=".5" opacity="0"/><rect class="hit" x="${L - 10}" width="${R - L + 20}" height="${Hh}" fill="transparent"/>`;
      svg.innerHTML = s;
      const hit = svg.querySelector(".hit"), hl = svg.querySelector(".hl");
      hit.onpointermove = (e) => { const r = svg.getBoundingClientRect(), z = r.width / W, x = (e.clientX - r.left) / z, i = Math.max(0, Math.min(MLAB.length - 1, Math.round(((x - L) / (R - L)) * (MLAB.length - 1))));
        hl.setAttribute("x1", X(i)); hl.setAttribute("x2", X(i)); hl.setAttribute("opacity", 1);
        showTip(r.left + X(i) * z, r.top + (mid - lab - (SIG[i] / max) * amp) * z, new Date(M[i].m + "-01").toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
          [["Sign-ups", num(SIG[i]), "#fff"], ["Projects", num(PRJ[i]), "#FFD0E6"], ["Minutes captioned", num(M[i].minutes)]]); };
      hit.onpointerleave = () => { hl.setAttribute("opacity", 0); hideTip(); };
      if (g < 1) flowRaf = RAF(frame); };
    flowRaf = RAF(frame);
  }

  /* ---- Payments: revenue and the latest ones ---- */
  const pays = $id("pays");
  pays.innerHTML = `${bg(GR.copper)}<div class="in-c"><div class="row" style="justify-content:space-between"><div class="ttl">Payments</div><span class="muted">30 days</span></div>
    <div class="row" style="margin-top:14px;align-items:flex-end;justify-content:space-between"><span class="big pyv">₹0</span><span style="padding-bottom:4px"><span class="delta">${num(data.charges30d)}</span><span class="muted"> payments</span></span></div>
    <div class="pyl" style="position:absolute;left:24px;right:24px;bottom:12px"></div></div><div class="rim"></div>`;
  function updatePays() { tween(pays.querySelector(".pyv"), data.revenue30d, (x) => inr(x));
    const list = data.payments;
    pays.querySelector(".pyl").innerHTML = list.length ? list.map((p, i) => `<div class="row" style="height:46px;${i ? "border-top:1px solid rgba(255,255,255,.1)" : ""}">
        <i style="width:28px;height:28px;border-radius:9px;background:rgba(0,0,0,.28);display:grid;place-items:center;font:600 12px var(--font-sans);font-style:normal">${esc(p.email.charAt(0).toUpperCase())}</i>
        <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.email)}</div><div class="mono muted" style="font-size:11px">${esc(p.plan)} · ${new Date(p.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</div></div>
        <div class="mono" style="font-size:13px">${inr(p.rupees)}</div></div>`).join("")
      : `<div class="muted" style="padding:12px 0">No payments yet. They show here as they come in.</div>`; }

  /* ---- Sign-ups this week: capsule columns per day ---- */
  const wk = $id("week");
  const WV = data.week.map((x) => x.n), WK = data.week.map((x) => new Date(x.d).toLocaleDateString("en-IN", { weekday: "short" }).slice(0, 2));
  wk.innerHTML = `${bg(GR.green)}<div class="in-c"><div class="ttl">This week</div>
    <div style="margin-top:14px"><span class="big wkv" style="font-size:34px">0</span></div><div class="row" style="margin-top:6px;gap:8px"><span class="delta">sign-ups</span><span class="muted">last 7 days</span></div>
    <svg class="wks" style="position:absolute;left:18px;bottom:14px" aria-hidden="true"></svg></div><div class="rim"></div>`;
  function updateWeek(instant) { if (!instant) tween(wk.querySelector(".wkv"), WV.reduce((a, b) => a + b, 0), (x) => num(x));
    const svg = wk.querySelector(".wks"), W = wk.clientWidth - 36, Hh = 160, pb = 18, n = WV.length, bw = Math.min(22, (W - 24) / n - 6), max = Math.max(2, ...WV), gap = (W - 24 - bw * n) / (n - 1);
    svg.setAttribute("width", W); svg.setAttribute("height", Hh);
    const Y = (x) => (Hh - pb) * (1 - x / max); let s = "";
    [0, Math.round(max / 2), max].forEach((t) => (s += `<text x="0" y="${Y(t) + 3.5}" font-size="9.5" fill="${T3}" font-family="ui-monospace,Menlo,monospace">${t}</text>`));
    WV.forEach((x, i) => { const X = 24 + i * (bw + gap), today = i === n - 1;
      s += `<rect x="${X}" y="${Y(max)}" width="${bw}" height="${Hh - pb - Y(max)}" rx="${bw / 2}" fill="rgba(0,0,0,.28)"/>
        <rect class="sb" x="${X}" y="${Hh - pb}" width="${bw}" height="0" rx="${bw / 2}" fill="${today ? ACC : "#fff"}" data-y="${Y(x)}" data-h="${Hh - pb - Y(x)}" style="transition:y .8s var(--ease) ${i * 70}ms,height .8s var(--ease) ${i * 70}ms"/>
        <text x="${X + bw / 2}" y="${Hh - 3}" text-anchor="middle" font-size="10" fill="${today ? "#fff" : T3}" font-family="ui-monospace,Menlo,monospace">${WK[i]}</text>
        <rect class="hit" x="${X - 4}" y="0" width="${bw + 8}" height="${Hh}" fill="transparent" data-i="${i}"/>`; });
    svg.innerHTML = s;
    RAF(() => RAF(() => svg.querySelectorAll(".sb").forEach((b) => { b.setAttribute("y", b.dataset.y); b.setAttribute("height", b.dataset.h); })));
    svg.querySelectorAll(".hit").forEach((h) => { h.onpointermove = (e) => { const i = +h.dataset.i; showTip(e.clientX, e.clientY, new Date(data.week[i].d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "short" }), [["Sign-ups", num(WV[i]), ACC]]); }; h.onpointerleave = hideTip; });
  }

  /* ---------- controls ---------- */
  const seg = $id("period");
  seg.innerHTML = ["1M", "3M", "1Y", "All"].map((k) => `<button type="button" aria-pressed="${S.period === k}">${k}</button>`).join("");
  seg.querySelectorAll("button").forEach((b) => (b.onclick = () => { S.period = b.textContent; seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-pressed", x === b)); updateUsers(); updateTotal(); }));
  function updateAll() { updateUsers(); updatePlans(); updateTotal(); updateActive(); updateFlow(); updatePays(); updateWeek(); }

  let rz; const ro = new ResizeObserver(() => { clearTimeout(rz); rz = setTimeout(() => { if (!usData) return; cancelAnimationFrame(usRaf); usGrow = 1; drawUsers(); updateFlow(true); updateWeek(true); updateActive(); }, 120); });
  ["us", "flow", "week", "act"].forEach((id) => ro.observe($id(id)));
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => { if (!alive) return; $id("grid").classList.add("in");
    root.querySelectorAll(".card").forEach((c, i) => (c.style.transitionDelay = i * 60 + "ms")); updateAll(); });

  return () => { alive = false; frames.forEach((f) => cancelAnimationFrame(f)); ro.disconnect(); clearTimeout(rz); };
}

export default function AdminBento({ data }: { data: Dashboard }) {
  const ref = React.useRef(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.innerHTML = markup(data.at);
    const stop = mount(el, data);
    return () => { stop(); el.innerHTML = ""; };
  }, [data]);
  return (
    <>
      <style>{CSS}</style>
      <div ref={ref} className="adb" />
    </>
  );
}
