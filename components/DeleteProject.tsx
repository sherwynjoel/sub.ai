"use client";
import { useEffect, useRef, useState } from "react";
import { stem } from "@/lib/projectName";

/** Asks before a project goes for good. Cancel takes the first focus, so Enter alone can't delete. */
export default function DeleteProject({ id, filename, onDeleted, onClose }: {
  id: string; filename: string; onDeleted: () => void; onClose: () => void;
}) {
  const box = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    if (box.current && !box.current.open) box.current.showModal();
  }, []);

  async function remove() {
    setBusy(true);
    setError("");
    const res = await fetch(`/api/jobs/${id}`, { method: "DELETE" }).catch(() => null);
    const out = await res?.json().catch(() => null);
    setBusy(false);
    if (!res?.ok) return setError(out?.error || "Couldn't delete it. Try again.");
    onDeleted();
    box.current?.close();
  }

  return (
    <dialog ref={box} className="rename-box" aria-label="Delete project" onClose={onClose}>
      <h2>Delete “{stem(filename)}”?</h2>
      <p>Its video and subtitles will be gone for good. The minutes it used don&apos;t come back.</p>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="rename-actions">
        <button type="button" className="btn ghost small" onClick={() => box.current?.close()}>Cancel</button>
        <button type="button" className="btn danger small" disabled={busy} onClick={remove}>{busy ? "Deleting…" : "Delete"}</button>
      </div>
    </dialog>
  );
}
