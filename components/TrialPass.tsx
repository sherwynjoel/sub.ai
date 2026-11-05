"use client";
import dynamic from "next/dynamic";
import { useState, useSyncExternalStore } from "react";

const PassReveal = dynamic(() => import("@/components/PassReveal"), { ssr: false });
const nothing = () => () => {};

/** The trial's pass, shown once on this browser: the moment the free minutes are ready. Billing can show it again. */
export default function TrialPass({ holder, passNo }: { holder: string; passNo: string }) {
  const key = `vasanam-pass-${passNo}`;
  const seen = useSyncExternalStore(nothing, () => localStorage.getItem(key) === "1", () => true);
  const [closed, setClosed] = useState(false);
  if (seen || closed) return null;
  return <PassReveal plan="free" holder={holder} passNo={passNo} fresh onClose={() => { localStorage.setItem(key, "1"); setClosed(true); }} />;
}
