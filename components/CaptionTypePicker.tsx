"use client";
import { CAPTION_TYPES, type CaptionType } from "@/lib/captionTypes";

type Props = {
  language: string;            // the language's English name, e.g. "Tamil"
  tamil: boolean;              // show the Tamil samples
  type: CaptionType; withEnglish: boolean;
  onChange: (type: CaptionType, withEnglish: boolean) => void;
  disabled?: boolean;
  compact?: boolean;           // a side panel: two columns, the chosen type's note once below
};

/** The caption types as cards with a sample line each, and whether to add the English line underneath. */
export default function CaptionTypePicker({ language, tamil, type, withEnglish, onChange, disabled, compact }: Props) {
  const def = CAPTION_TYPES.find((t) => t.id === type)!;
  return (
    <fieldset className={`ctype${compact ? " compact" : ""}`} disabled={disabled}>
      <legend>Caption type</legend>
      <div className="ctype-cards" role="radiogroup" aria-label="Caption type">
        {CAPTION_TYPES.map((t) => (
          <label key={t.id} className={`ctype-card${t.id === type ? " on" : ""}`}>
            <input type="radio" name="ctype" value={t.id} checked={t.id === type} onChange={() => onChange(t.id, withEnglish)} />
            <strong>{t.title(language)}</strong>
            {tamil && t.sample && <span className="ctype-sample" lang={t.id === "english" || t.id === "roman" ? "en" : "ta"}>{t.sample}</span>}
            <span className="ctype-note">{t.note(language)}</span>
          </label>
        ))}
      </div>
      <p className="ctype-chosen">{def.note(language)}</p>
      {def.english === "line" && (
        <label className="ctype-en">
          <input type="checkbox" checked={withEnglish} onChange={(e) => onChange(type, e.target.checked)} />
          {type === "translated" ? "Keep the original English underneath" : "Add an English translation underneath"}
        </label>
      )}
    </fieldset>
  );
}
