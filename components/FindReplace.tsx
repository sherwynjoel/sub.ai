"use client";
import { useMemo, useState } from "react";
import type { Cue } from "@/db/schema";
import { findText, replaceText } from "@/lib/cueEdit";

/** Find a word in every caption, step through them, or replace them all in one undo step. */
export default function FindReplace({ cues, onGo, onReplace, onClose }: {
  cues: Cue[]; onGo: (i: number) => void; onReplace: (next: Cue[], count: number) => void; onClose: () => void;
}) {
  const [find, setFind] = useState(""), [to, setTo] = useState(""), [at, setAt] = useState(-1);
  const { count, where } = useMemo(() => findText(cues, find), [cues, find]);
  const step = (d: number) => {
    if (!where.length) return;
    const next = (at + d + where.length) % where.length;
    setAt(next);
    onGo(where[next]);
  };
  return (
    <div className="find-panel" role="dialog" aria-label="Find and replace" onKeyDown={(e) => { e.stopPropagation(); if (e.key === "Escape") onClose(); }}>
      <div className="find-head"><b>Find and replace</b><button className="link" onClick={onClose} aria-label="Close">Close</button></div>
      <label>Find<input autoFocus value={find} onChange={(e) => { setFind(e.target.value); setAt(-1); }} onKeyDown={(e) => { if (e.key === "Enter") step(e.shiftKey ? -1 : 1); }} /></label>
      <label>Replace with<input value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <p className="muted small" aria-live="polite">{!find.trim() ? "Type a word to look for." : count ? `${count} found in ${where.length} caption${where.length === 1 ? "" : "s"}${at >= 0 ? ` · showing ${at + 1} of ${where.length}` : ""}` : "Not found."}</p>
      <div className="find-actions">
        <button className="btn ghost small" onClick={() => step(-1)} disabled={!where.length} aria-label="Previous caption">◀</button>
        <button className="btn ghost small" onClick={() => step(1)} disabled={!where.length} aria-label="Next caption">▶</button>
        <button className="btn small" disabled={!count} onClick={() => { onReplace(replaceText(cues, find, to), count); setAt(-1); }}>Replace all</button>
      </div>
    </div>
  );
}
