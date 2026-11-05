import StyleUsage from "@/components/admin/StyleUsage";
import { db } from "@/db";
import { styleCounts, styleTable } from "@/lib/styleUsage";
import "@/app/caption-styles.css";

export const dynamic = "force-dynamic";

export default async function Styles({ searchParams }: { searchParams: Promise<{ period?: string }> }) {
  const recent = (await searchParams).period === "30";
  const counts = await styleCounts(db, recent);
  return <StyleUsage table={styleTable(counts)} recent={recent} />;
}
