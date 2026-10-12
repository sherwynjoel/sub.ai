"use client";
import { useState } from "react";
import { copyText } from "@/lib/copy";

export default function CopyText({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <span className="copy">
      <code>{text}</code>
      <button className="btn ghost small" onClick={() => copyText(text).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</button>
    </span>
  );
}
