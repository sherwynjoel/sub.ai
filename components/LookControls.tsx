"use client";
import ColorPicker from "@/components/ColorPicker";
import { ANIMS, BLENDS, CAPTION_FONTS, FONT_LIKE, highlights, takesLineSpacing, HIGHLIGHTS, TAMIL_FONTS, type Anim, type Blend, type CaptionCustom, type CaptionStyle, type Highlight, type Placement } from "@/lib/captionStyles";

type Props = {
  look: CaptionStyle & Placement;   // the resolved look these controls show
  own: CaptionCustom;               // what's set here (project customisation, or one caption's own look)
  set: (patch: CaptionCustom) => void;
  tamil: boolean;                   // show the Tamil font
  project?: CaptionStyle;           // set for one caption: "Project" choices fall back to this look
  setAll?: (patch: CaptionCustom) => void; // for one caption: line spacing, which is always every caption's
};

const hex = (c: string | undefined, fallback: string) => (c ?? fallback).slice(0, 7);

/** Four lines, the short ones flush to that side (or centred). */
function AlignIcon({ side }: { side: "left" | "center" | "right" }) {
  const x = (w: number) => (side === "left" ? 2 : side === "right" ? 14 - w : 8 - w / 2);
  return (
    <svg width="14" height="12" viewBox="0 0 16 12" aria-hidden="true">
      {[12, 8, 12, 6].map((w, n) => <rect key={n} x={x(w)} y={n * 3} width={w} height="1.6" rx=".8" fill="currentColor" />)}
    </svg>
  );
}

/** Every control for how captions look, for the whole project or for one caption. */
export default function LookControls({ look, own, set, tamil, project, setAll }: Props) {
  const highlight = own.highlight ?? "style";
  return (
    <div className="look">
      <fieldset>
        <legend>Text</legend>
        <label>Font
          <select value={project ? own.font ?? "" : look.font} onChange={(e) => set({ font: e.target.value || undefined })}>
            {project && <option value="">Project ({project.font})</option>}
            {CAPTION_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f}{FONT_LIKE[f] ? ` (like ${FONT_LIKE[f]})` : ""}</option>)}
          </select>
        </label>
        {tamil && <label>Tamil font
          <select value={project ? own.fontTa ?? "" : look.fontTa ?? "Noto Sans Tamil"} onChange={(e) => set({ fontTa: e.target.value || undefined })}>
            {project && <option value="">Project ({project.fontTa ?? "Noto Sans Tamil"})</option>}
            {TAMIL_FONTS.map((f) => <option key={f} value={f} style={{ fontFamily: f }}>{f} — தமிழ்</option>)}
          </select>
        </label>}
        <label>Size <span className="cz-val">{Math.round(look.scale * 100)}%</span>
          <input type="range" min={0.4} max={2.6} step={0.05} value={look.scale} onChange={(e) => set({ size: +e.target.value })} title="100% is the standard size every style starts at" />
        </label>
        <div className="look-row">
          <div className="seg" role="group" aria-label="Weight and slant">
            <button aria-pressed={!!look.bold} onClick={() => set({ bold: !look.bold })} style={{ fontWeight: 700 }}>B</button>
            <button aria-pressed={!!look.italic} onClick={() => set({ italic: !look.italic })} style={{ fontStyle: "italic" }}>I</button>
          </div>
          <div className="seg" role="group" aria-label="Letter case">
            {([["none", "Aa"], ["upper", "AA"], ["lower", "aa"]] as const).map(([v, l]) => (
              <button key={v} title={v === "none" ? "As typed" : v === "upper" ? "Capitals" : "Lower case"} aria-pressed={(look.caps ? "upper" : look.lower ? "lower" : "none") === v} onClick={() => set({ case: v })}>{l}</button>
            ))}
          </div>
          <div className="seg" role="group" aria-label="Text alignment">
            {(["left", "center", "right"] as const).map((v) => (
              <button key={v} title={`Align ${v === "center" ? "centre" : v}`} aria-label={`Align ${v === "center" ? "centre" : v}`} aria-pressed={(look.textAlign ?? "center") === v} onClick={() => set({ textAlign: v })}>
                <AlignIcon side={v} />
              </button>
            ))}
          </div>
        </div>
        <label>Letter spacing <span className="cz-val">{Math.round((look.spacing ?? 0) * 100)}</span>
          <input type="range" min={-0.1} max={0.5} step={0.01} value={look.spacing ?? 0} onChange={(e) => set({ spacing: +e.target.value })} />
        </label>
        {(!project || setAll) && (takesLineSpacing(look)
          ? <label>Line spacing{project && " (all captions)"} <span className="cz-val">{Math.round((look.lineHeight ?? 1) * 100)}%</span>
              <input type="range" min={0.7} max={2.5} step={0.05} value={look.lineHeight ?? 1} onChange={(e) => (setAll ?? set)({ lineHeight: +e.target.value })}
                title="Space between the lines of a caption (and the English line under it), for every caption" />
            </label>
          : <p className="muted small">Line spacing: this style lays out its own lines.</p>)}
      </fieldset>

      <fieldset>
        <legend>Colour</legend>
        <div className="look-row">
          {look.gradient ? <>
            <span className="cz-color">Top<ColorPicker value={hex(look.gradient[0], "#ffffff")} onChange={(c) => set({ gradient: [c, look.gradient![1]] })} label="Gradient top colour" /></span>
            <span className="cz-color">Bottom<ColorPicker value={hex(look.gradient[1], "#ffb37a")} onChange={(c) => set({ gradient: [look.gradient![0], c] })} label="Gradient bottom colour" /></span>
          </> : <span className="cz-color">Text<ColorPicker value={hex(look.color, "#ffffff")} onChange={(c) => set({ color: c })} label="Text colour" /></span>}
          {highlights(look) && <span className="cz-color">Highlight<ColorPicker value={hex(own.accent ?? look.mark ?? look.keyword?.color ?? look.active, "#ffe14d")} onChange={(c) => set({ accent: c })} label="Highlight colour" /></span>}
        </div>
        {(!project || setAll) && <label>Text blend{project && " (all captions)"}
          <select value={look.blend ?? ""} onChange={(e) => (setAll ?? set)({ blend: (e.target.value || null) as Blend | null })}
            title="The letters as a window onto the video: Negative shows it inverted inside them (white text), the others mix the text colour in">
            <option value="">Normal</option>
            {Object.entries(BLENDS).map(([k, [label]]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>}
        <label className="cz-check"><input type="checkbox" checked={!!look.gradient} onChange={(e) => set({ gradient: e.target.checked ? [hex(look.color, "#ffffff"), "#ffb37a"] : null })} /> Gradient (top colour to bottom colour)</label>
        {highlights(look) && <label>Spoken word
          <select value={highlight} onChange={(e) => set({ highlight: e.target.value === "style" ? undefined : (e.target.value as Highlight) })}>
            {Object.entries(HIGHLIGHTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>}
        <label>Opacity <span className="cz-val">{Math.round((look.opacity ?? 1) * 100)}%</span>
          <input type="range" min={0.1} max={1} step={0.05} value={look.opacity ?? 1} onChange={(e) => set({ opacity: +e.target.value })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Outline &amp; shadow</legend>
        <div className="look-row">
          <label className="cz-check"><input type="checkbox" checked={!!look.outline} onChange={(e) => set({ outline: e.target.checked ? hex(look.outline?.[0], "#000000") : null })} /> Outline</label>
          {look.outline && <ColorPicker value={hex(look.outline[0], "#000000")} onChange={(c) => set({ outline: c })} label="Outline colour" />}
        </div>
        {look.outline && <label>Outline thickness <span className="cz-val">{Math.round(look.outline[1] * 100)}</span>
          <input type="range" min={0.01} max={0.2} step={0.01} value={look.outline[1]} onChange={(e) => set({ outlineWidth: +e.target.value })} />
        </label>}
        <div className="look-row">
          <label className="cz-check"><input type="checkbox" checked={!!look.shadow} onChange={(e) => set({ shadow: e.target.checked, shadowSize: e.target.checked ? look.shadow || 0.06 : 0 })} /> Shadow</label>
          {!!look.shadow && <ColorPicker value={hex(look.shadowColor, "#000000")} onChange={(c) => set({ shadowColor: c })} label="Shadow colour" />}
        </div>
        {!!look.shadow && <label>Shadow size <span className="cz-val">{Math.round(look.shadow * 100)}</span>
          <input type="range" min={0.01} max={0.4} step={0.01} value={look.shadow} onChange={(e) => set({ shadowSize: +e.target.value })} />
        </label>}
      </fieldset>

      <fieldset>
        <legend>Background</legend>
        <div className="look-row">
          <label className="cz-check"><input type="checkbox" checked={!!look.box} onChange={(e) => set({ box: e.target.checked ? hex(look.box, "#0b0b0b") : null })} /> Box behind the text</label>
          {look.box && <ColorPicker value={hex(look.box, "#0b0b0b")} onChange={(c) => set({ box: c })} label="Background colour" />}
        </div>
        {look.box && <label>Padding <span className="cz-val">{Math.round((look.boxPad ?? 0.28) * 100)}</span>
          <input type="range" min={0.05} max={0.8} step={0.01} value={look.boxPad ?? 0.28} onChange={(e) => set({ boxPad: +e.target.value })} />
        </label>}
      </fieldset>

      <fieldset>
        <legend>Motion</legend>
        <label>Comes in with
          <select value={look.anim ?? "none"} onChange={(e) => set({ anim: e.target.value as Anim })}>
            {Object.entries(ANIMS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
        </label>
        <label>Rotation <span className="cz-val">{Math.round(look.rotate ?? 0)}°</span>
          <input type="range" min={-45} max={45} step={1} value={look.rotate ?? 0} onChange={(e) => set({ rotate: +e.target.value })} />
        </label>
      </fieldset>

      <fieldset>
        <legend>Position {look.x !== undefined && <span className="muted small">(dragged)</span>}</legend>
        <div className="seg" role="group" aria-label="Position">
          {(["top", "middle", "bottom"] as const).map((v) => (
            <button key={v} aria-pressed={look.position === v && look.x === undefined} onClick={() => set({ position: v, x: undefined, y: undefined })}>{v[0].toUpperCase() + v.slice(1)}</button>
          ))}
        </div>
        <p className="muted small">Or drag the caption on the video.</p>
      </fieldset>
    </div>
  );
}
