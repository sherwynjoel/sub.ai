"use client";
import { useState } from "react";

/** hh:mm:ss.mmm */
export const tc = (s: number) => {
  const ms = Math.round(s * 1000);
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)}.${p(ms % 1000, 3)}`;
};

/** Accepts "hh:mm:ss.mmm", "mm:ss.mmm" or plain seconds. */
export const parseTc = (v: string) => {
  const n = v.trim().replace(",", ".").split(":").reduce((acc, part) => acc * 60 + Number(part), 0);
  return Number.isFinite(n) && n >= 0 ? n : null;
};

/** A time to type in. `short`: without the hours, when they'd be 00. */
export default function TimeInput({ value, onChange, label, short }: { value: number; onChange: (v: number) => void; label: string; short?: boolean }) {
  const shown = (v: number) => (short && v < 3600 ? tc(v).slice(3) : tc(v));
  const [text, setText] = useState(shown(value)); // parent remounts via key when value changes
  return (
    <input
      className="time"
      value={text}
      aria-label={label}
      title={label}
      onChange={(e) => setText(e.target.value)}
      onKeyDown={(e) => { if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }}
      onBlur={() => { const v = parseTc(text); if (v === null) setText(shown(value)); else if (Math.abs(v - value) > 0.0005) onChange(v); }}
    />
  );
}
