"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

/* ---------- colour maths (HSV: hue 0–360, saturation and value 0–1) ---------- */
const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const hex2 = (n: number) => Math.round(clamp(n, 0, 255)).toString(16).padStart(2, "0");
export function hsvToHex(h: number, s: number, v: number) {
  const f = (n: number) => { const k = (n + h / 60) % 6; return v - v * s * Math.max(0, Math.min(k, 4 - k, 1)); };
  return `#${hex2(f(5) * 255)}${hex2(f(3) * 255)}${hex2(f(1) * 255)}`.toUpperCase();
}
export function hexToHsv(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1, 7), 16), r = ((n >> 16) & 255) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), d = max - Math.min(r, g, b);
  const h = d === 0 ? 0 : max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [(h * 60 + 360) % 360, max ? d / max : 0, max];
}
/** A colour typed by the user: #RRGGBB, RRGGBB, #RGB or rgb(r, g, b), as #RRGGBB; null when it isn't one. */
export function parseColor(text: string): string | null {
  const t = text.trim();
  let m = t.match(/^#?([0-9a-f]{6})$/i);
  if (m) return `#${m[1]}`.toUpperCase();
  m = t.match(/^#?([0-9a-f])([0-9a-f])([0-9a-f])$/i);
  if (m) return `#${m[1]}${m[1]}${m[2]}${m[2]}${m[3]}${m[3]}`.toUpperCase();
  m = t.match(/^rgba?\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})/i);
  if (m && [m[1], m[2], m[3]].every((x) => +x <= 255)) return `#${hex2(+m[1])}${hex2(+m[2])}${hex2(+m[3])}`.toUpperCase();
  return null;
}

const QUICK = ["#FFFFFF", "#000000", "#FFD60A", "#FF3B30", "#7F011F", "#F5EBD0", "#34C759", "#0A84FF", "#AF52DE", "#FF9F0A"];
const RECENT_KEY = "vs-recent-colours";
const recent = (): string[] => { try { return JSON.parse(localStorage.getItem(RECENT_KEY) || "[]").filter((c: unknown) => typeof c === "string" && parseColor(c)).slice(0, 8); } catch { return []; } };
const remember = (c: string) => { try { localStorage.setItem(RECENT_KEY, JSON.stringify([c, ...recent().filter((x) => x !== c)].slice(0, 8))); } catch { /* private mode */ } };

type EyeDropperCtor = new () => { open: () => Promise<{ sRGBHex: string }> };

/**
 * A colour control: a swatch that opens a colour wheel (hue around, strength outwards) with a brightness slider, a
 * box for a colour code (#7F011F, f00, rgb(…)), an eyedropper to take a colour from the screen (where the browser
 * has one), and quick and recent colours. Used everywhere a colour is picked.
 */
export default function ColorPicker({ value, onChange, label, className }: { value: string; onChange: (hex: string) => void; label: string; className?: string }) {
  const cur = parseColor(value) ?? "#FFFFFF";
  const [open, setOpen] = useState(false);
  const [hsv, setHsv] = useState<[number, number, number]>(() => hexToHsv(cur));
  const [code, setCode] = useState(cur);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null), wheel = useRef<HTMLDivElement>(null);
  const picking = useRef(false);
  const last = useRef(cur); // what was last sent, so a value coming back from the parent doesn't move the wheel

  // A new value from outside (another caption picked, a reset): the wheel and code follow it.
  useEffect(() => {
    if (cur === last.current) return;
    last.current = cur;
    setHsv(hexToHsv(cur));
    setCode(cur);
  }, [cur]);

  const send = (h: number, s: number, v: number) => {
    setHsv([h, s, v]);
    const c = hsvToHex(h, s, v);
    last.current = c;
    setCode(c);
    onChange(c);
  };
  const pickHex = (c: string) => { const [h, s, v] = hexToHsv(c); last.current = c; setHsv([h, s, v]); setCode(c); onChange(c); remember(c); };

  // Placed under the swatch (above it when there's no room), kept on screen.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btn.current?.getBoundingClientRect(), p = pop.current;
      if (!b || !p) return;
      const w = p.offsetWidth, h = p.offsetHeight;
      const left = clamp(b.left + b.width / 2 - w / 2, 8, innerWidth - w - 8);
      const top = b.bottom + 8 + h <= innerHeight - 8 ? b.bottom + 8 : Math.max(8, b.top - 8 - h);
      setPos({ left, top });
    };
    place();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => { removeEventListener("resize", place); removeEventListener("scroll", place, true); };
  }, [open]);
  // Closed by a tap elsewhere or Esc (the colour is kept); the colour used goes to the recent ones.
  const close = () => { setOpen(false); setPos(null); remember(last.current); };
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) close(); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); close(); btn.current?.focus(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key, true); };
  });

  // The wheel: the angle from the top is the hue, the distance from the centre the strength.
  const fromPointer = (e: { clientX: number; clientY: number }) => {
    const r = wheel.current?.getBoundingClientRect();
    if (!r) return;
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    const h = ((Math.atan2(dx, -dy) * 180) / Math.PI + 360) % 360, s = clamp(Math.hypot(dx, dy) / (r.width / 2));
    send(h, s, hsv[2] < 0.05 ? 1 : hsv[2]); // picking on a black wheel brightens it so the pick shows
  };
  const [h, s, v] = hsv;
  const R = 50; // the marker, in % of the wheel
  const mark = { left: `${R + R * s * Math.sin((h * Math.PI) / 180)}%`, top: `${R - R * s * Math.cos((h * Math.PI) / 180)}%` };
  const Eye = typeof window !== "undefined" ? (window as unknown as { EyeDropper?: EyeDropperCtor }).EyeDropper : undefined;
  const typed = parseColor(code);

  return (
    <>
      <button ref={btn} type="button" className={`cp-swatch${className ? ` ${className}` : ""}`} aria-label={label} title={`${label}: ${cur}`} aria-haspopup="dialog" aria-expanded={open}
        style={{ "--cp": cur } as React.CSSProperties} onClick={() => (open ? close() : setOpen(true))} />
      {open && createPortal(
        <div ref={pop} className="cp-pop" role="dialog" aria-label={label} style={pos ? { left: pos.left, top: pos.top } : { visibility: "hidden", left: 0, top: 0 }}
          onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
          <div ref={wheel} className="cp-wheel" style={{ "--cp-dim": 1 - v } as React.CSSProperties}
            onPointerDown={(e) => { e.preventDefault(); picking.current = true; e.currentTarget.setPointerCapture(e.pointerId); fromPointer(e); }}
            onPointerMove={(e) => { if (picking.current) fromPointer(e); }}
            onPointerUp={() => { picking.current = false; remember(last.current); }}>
            <span className="cp-mark" style={{ ...mark, background: cur }} />
          </div>
          <label className="cp-row">
            <span>Brightness</span>
            <input type="range" min={0} max={100} value={Math.round(v * 100)} aria-label="Brightness"
              style={{ "--cp-full": hsvToHex(h, s, 1) } as React.CSSProperties} onChange={(e) => send(h, s, +e.target.value / 100)} />
          </label>
          <div className="cp-row">
            <span className="cp-now" style={{ background: cur }} />
            <input className={`cp-code${typed ? "" : " bad"}`} value={code} spellCheck={false} aria-label="Colour code" placeholder="#7F011F"
              onChange={(e) => { setCode(e.target.value); const c = parseColor(e.target.value); if (c) { const [hh, ss, vv] = hexToHsv(c); last.current = c; setHsv([hh, ss, vv]); onChange(c); } }}
              onBlur={() => { if (!typed) setCode(cur); else remember(typed); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (typed) { remember(typed); close(); } } }} />
            {Eye && <button type="button" className="cp-eye" title="Pick a colour from the screen" aria-label="Pick a colour from the screen"
              onClick={async () => { try { const r = await new Eye().open(); const c = parseColor(r.sRGBHex); if (c) pickHex(c); } catch { /* cancelled */ } }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M2 22l1-1h3l9-9M3 21v-3l9-9M15 6l3-3 3 3-3 3M14 5l5 5" /></svg>
            </button>}
          </div>
          {!typed && <p className="cp-hint">Type a colour code like #7F011F, f00 or rgb(127, 1, 31)</p>}
          <div className="cp-swatches" aria-label="Quick colours">
            {[...new Set([...recent(), ...QUICK])].slice(0, 16).map((c) => (
              <button key={c} type="button" style={{ background: c }} aria-label={c} title={c} aria-pressed={c === cur} onClick={() => pickHex(c)} />
            ))}
          </div>
        </div>, document.body)}
    </>
  );
}
