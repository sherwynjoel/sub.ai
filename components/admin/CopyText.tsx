"use client";
import { useState } from "react";

export default function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="copy">
      <code>{text}</code>
      <button className="btn ghost small" onClick={() => navigator.clipboard.writeText(text).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</button>
    </span>
  );
}
