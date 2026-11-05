import StyleUsage from "@/components/admin/StyleUsage";
import { db } from "@/db";
import { styleCounts, styleTable } from "@/lib/styleUsage";
import "@/app/caption-styles.css";

export const dynamic = "force-dynamic";

export default async function Styles({ searchParams }: { searchParams: Promise<{ period?: string; who?: string }> }) {
  const sp = await searchParams;
  const recent = sp.period === "30", customers = sp.who === "customers";
  return <StyleUsage table={styleTable(await styleCounts(db, { recent, customers }))} recent={recent} customers={customers} />;
}
