"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Cue } from "@/db/schema";
import { startsOf, wordsOf } from "@/lib/cueEdit";

export type WordRef = { cue: number; j: number };

/**
 * Every word of the captions in a row under the video. The word being said sits in the middle (under the ▼) and the
 * row scrolls with the video; tapping a word jumps there, tapping it again opens it for fixing (clear it to delete).
 */
export default function WordStrip({ cues, line, now, picked, lang, onPick, onEdit }: {
  cues: Cue[]; line: "ta" | "en"; now: number; picked: WordRef | null; lang?: string;
  onPick: (w: WordRef, start: number) => void;
  onEdit: (w: WordRef, text: string) => void;
}) {
  const row = useRef<HTMLDivElement>(null);
  const [editing, setEditing] = useState<WordRef | null>(null);
  const words = useMemo(() => cues.flatMap((c, cue) => {
    const ws = wordsOf(c[line]), st = startsOf(c, line);
    return ws.map((text, j) => ({ cue, j, text, start: st[j] ?? c.start }));
  }), [cues, line]);
  // The word being said: the last one started (between captions, the last one before the playhead).
  let at = -1;
  for (let k = 0; k < words.length && words[k].start <= now + 0.01; k++) at = k;
  const same = (a: WordRef | null, b: WordRef) => !!a && a.cue === b.cue && a.j === b.j;

  useEffect(() => {
    const el = row.current, pill = el?.children[at] as HTMLElement | undefined;
    if (!el || !pill) return;
    el.scrollTo({ left: pill.offsetLeft + pill.offsetWidth / 2 - el.clientWidth / 2, behavior: "smooth" });
  }, [at]);

  if (!words.length) return null;
  return (
    <div className="wstrip">
      <span className="wstrip-mark" aria-hidden="true">▼</span>
      <div className="wstrip-row" ref={row} role="list" aria-label="Words: tap one to go there, tap it again to fix it">
        {words.map((w, k) => {
          const ref = { cue: w.cue, j: w.j };
          if (same(editing, ref)) {
            return (
              <input key={`${w.cue}-${w.j}`} className="wpill editing" lang={lang} defaultValue={w.text} autoFocus aria-label="Fix this word (clear it to delete)"
                size={Math.max(3, w.text.length + 1)}
                onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); if (e.key === "Escape") { e.currentTarget.value = w.text; e.currentTarget.blur(); } }}
                onBlur={(e) => { setEditing(null); if (e.target.value.trim() !== w.text) onEdit(ref, e.target.value); }} />
            );
          }
          return (
            <button key={`${w.cue}-${w.j}`} role="listitem" className={`wpill${k === at ? " on" : ""}${same(picked, ref) ? " picked" : ""}`} lang={lang}
              title={same(picked, ref) ? "Tap to fix this word" : undefined}
              onClick={() => { if (same(picked, ref)) setEditing(ref); else onPick(ref, w.start); }}>
              {w.text}
            </button>
          );
        })}
      </div>
    </div>
  );
}
