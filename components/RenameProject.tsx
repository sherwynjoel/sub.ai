"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { stem } from "@/lib/projectName";

/** A small box to give a project a new name. */
export default function RenameProject({ id, filename, onRenamed, onClose }: {
  id: string; filename: string; onRenamed: (filename: string) => void; onClose: () => void;
}) {
  const box = useRef<HTMLDialogElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (box.current && !box.current.open) box.current.showModal();
    field.current?.select();
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await fetch(`/api/jobs/${id}`, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ name: field.current?.value }) }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok || !out?.filename) return setError(out?.error || "Couldn't rename it. Try again.");
    onRenamed(out.filename);
    box.current?.close();
  }

  return (
    <dialog ref={box} className="rename-box" aria-label="Rename project" onClose={onClose}>
      <form onSubmit={save}>
        <label htmlFor="rename-field">Project name</label>
        <input ref={field} id="rename-field" className="input" defaultValue={stem(filename)} maxLength={120} required autoComplete="off" />
        {error && <p role="alert" className="error">{error}</p>}
        <div className="rename-actions">
          <button type="button" className="btn ghost small" onClick={() => box.current?.close()}>Cancel</button>
          <button className="btn small" disabled={busy}>{busy ? "Saving…" : "Save"}</button>
        </div>
      </form>
    </dialog>
  );
}
