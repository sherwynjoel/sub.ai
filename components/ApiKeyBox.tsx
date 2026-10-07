"use client";
import { useState } from "react";

export default function ApiKeyBox({ hint }: { hint: string | null }) {
  const [key, setKey] = useState("");
  const [shown, setShown] = useState(hint);
  const [copied, setCopied] = useState(false);

  async function make() {
    if (shown && !confirm("Create a new key? The old key stops working in any panel that uses it.")) return;
    const res = await fetch("/api/keys", { method: "POST" });
    const data = await res.json();
    setKey(data.key);
    setShown(data.hint);
    setCopied(false);
  }

  return (
    <div className="keybox">
      {key ? (
        <>
          <code>{key}</code>
          <div className="row">
            <button className="btn small" onClick={() => navigator.clipboard.writeText(key).then(() => setCopied(true))}>{copied ? "Copied" : "Copy key"}</button>
            <span className="muted small">Shown once. Copy it now.</span>
          </div>
        </>
      ) : (
        <div className="row">
          {shown && <code>{shown}</code>}
          <button className="btn small" onClick={make}>{shown ? "Create a new key" : "Create my key"}</button>
        </div>
      )}
    </div>
  );
}
