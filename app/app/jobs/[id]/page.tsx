import { notFound } from "next/navigation";
import Editor from "@/components/Editor";
import { requireUser } from "@/lib/auth";
import { ownJob, publicJob } from "@/lib/jobs";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const u = await requireUser();
  const j = await ownJob((await params).id, u);
  if (!j) notFound();
  return <Editor initial={JSON.parse(JSON.stringify(publicJob(j, true)))} />;
}
