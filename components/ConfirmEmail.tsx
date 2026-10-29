"use client";
import { useEffect, useState } from "react";

/** Asks a new user to confirm their email before the free minutes start; says so when a link was just opened. */
export default function ConfirmEmail() {
  const [me, setMe] = useState<{ email: string; confirm: boolean } | null>(null);
  const [opened, setOpened] = useState<"0" | "1" | null>(null);
  const [sent, setSent] = useState<"" | "sending" | "sent" | string>("");

  useEffect(() => {
    const q = new URLSearchParams(location.search).get("confirmed");
    if (q) history.replaceState(null, "", location.pathname); // not again on refresh
    fetch("/api/me").then((r) => (r.ok ? r.json() : null)).then((m) => {
      if (q === "0" || q === "1") setOpened(q);
      setMe(m);
    }).catch(() => {});
  }, []);

  async function again() {
    setSent("sending");
    const res = await fetch("/api/auth/confirm", { method: "POST" }).catch(() => null);
    const data = res ? await res.json().catch(() => ({})) : {};
    setSent(res?.ok ? "sent" : data.error || "Couldn't send it. Try again in a minute.");
  }

  if (opened === "1" && !me?.confirm) return <p className="confirm-note ok" role="status">Email confirmed. Your free minutes are ready: upload a video to start.</p>;
  if (!me?.confirm) return null;
  return (
    <div className="confirm-note" role="alert">
      <p>
        <b>{opened === "0" ? "That link has expired or was already used." : "Confirm your email to start your free minutes."}</b>{" "}
        {sent === "sent" ? `A new link is on its way to ${me.email}.` : `Open the link we sent to ${me.email} (check spam too).`}
      </p>
      {sent !== "sent" && (
        <button className="btn ghost small" onClick={again} disabled={sent === "sending"}>{sent === "sending" ? "Sending…" : "Send the email again"}</button>
      )}
      {sent && sent !== "sending" && sent !== "sent" && <p className="error">{sent}</p>}
    </div>
  );
}
