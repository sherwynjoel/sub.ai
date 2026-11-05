"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { popupRoot } from "@/lib/popupRoot";
import { FONT_LIKE } from "@/lib/captionStyles";

/**
 * A font control that shows the fonts themselves: a button with the chosen font written in it, opening a list where
 * every font's name is written in that font (with a sample line), and a search box. A browser's own <select> can't
 * show fonts (macOS draws every option in the system font), so users couldn't see how a font looks before picking it.
 * "" is the "no font of its own" choice (the project's or caption's), shown when `none` is given.
 */
export default function FontPicker({ value, onChange, fonts, none, label, sample, className }: {
  value: string; onChange: (font: string) => void; fonts: readonly string[]; none?: string; label: string;
  sample?: string; className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [pos, setPos] = useState<{ left: number; top: number; maxHeight: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null), pop = useRef<HTMLDivElement>(null), list = useRef<HTMLDivElement>(null);
  const shown = value || "";
  const face = (f: string) => (f ? `"${f}", var(--font-body), sans-serif` : undefined);

  // Under the button (above it when there's more room there), kept on screen; the chosen font scrolled into view.
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const b = btn.current?.getBoundingClientRect(), p = pop.current;
      if (!b || !p) return;
      const w = p.offsetWidth, below = innerHeight - b.bottom - 16, above = b.top - 16;
      const up = below < 260 && above > below, maxHeight = Math.min(420, Math.max(180, up ? above : below));
      const left = Math.min(Math.max(8, b.left), innerWidth - w - 8);
      setPos({ left, top: up ? Math.max(8, b.top - 8 - Math.min(maxHeight, p.offsetHeight)) : b.bottom + 8, maxHeight });
    };
    place();
    addEventListener("resize", place);
    addEventListener("scroll", place, true);
    return () => { removeEventListener("resize", place); removeEventListener("scroll", place, true); };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    list.current?.querySelector<HTMLElement>("[aria-selected='true']")?.scrollIntoView({ block: "center" });
    const away = (e: PointerEvent) => { if (!pop.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node)) setOpen(false); };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); setOpen(false); btn.current?.focus(); } };
    document.addEventListener("pointerdown", away, true);
    document.addEventListener("keydown", key, true);
    return () => { document.removeEventListener("pointerdown", away, true); document.removeEventListener("keydown", key, true); };
  }, [open]);

  const pick = (f: string) => { onChange(f); setOpen(false); setQ(""); };
  const match = (f: string) => !q.trim() || `${f} ${FONT_LIKE[f] ?? ""}`.toLowerCase().includes(q.trim().toLowerCase());
  const items = fonts.filter(match);

  return (
    <>
      <button ref={btn} type="button" className={`fp-btn${className ? ` ${className}` : ""}`} aria-label={`${label}: ${shown || none || ""}`} aria-haspopup="listbox" aria-expanded={open}
        onClick={() => { setOpen((o) => !o); setPos(null); }} style={{ fontFamily: face(shown) }}>
        <span className="fp-name">{shown || none}</span>
        <svg viewBox="0 0 12 12" width="10" height="10" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && createPortal(
        <div ref={pop} className="fp-pop" role="dialog" aria-label={label} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}
          style={pos ? { left: pos.left, top: pos.top, maxHeight: pos.maxHeight } : { left: 0, top: 0, visibility: "hidden" }}>
          <input className="fp-search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search fonts" aria-label="Search fonts" autoFocus
            onKeyDown={(e) => { if (e.key === "Enter" && items[0]) { e.preventDefault(); pick(items[0]); } }} />
          <div ref={list} className="fp-list" role="listbox" aria-label={label}>
            {none && !q.trim() && (
              <button type="button" role="option" aria-selected={!value} className="fp-item" onClick={() => pick("")}>
                <span className="fp-item-name">{none}</span>
              </button>
            )}
            {items.map((f) => (
              <button key={f} type="button" role="option" aria-selected={value === f} className="fp-item" onClick={() => pick(f)} title={f}>
                <span className="fp-item-name" style={{ fontFamily: face(f) }}>{f}</span>
                {FONT_LIKE[f] && <small className="fp-like">like {FONT_LIKE[f]}</small>}
                {sample && <span className="fp-sample" style={{ fontFamily: face(f) }}>{sample}</span>}
              </button>
            ))}
            {!items.length && <p className="fp-empty">No font called &ldquo;{q}&rdquo;</p>}
          </div>
        </div>, popupRoot())}
    </>
  );
}
