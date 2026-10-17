import { readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import Editor from "@/components/Editor";
import "@/app/app/app.css";

/**
 * Development only: the editor with a saved job (DEV_JOB_FILE, JSON from GET /api/jobs/:id) and its video at
 * /dev-media.mp4, to try the editor without a database. Saving fails here (no API). Not available in production.
 */
export default function Page() {
  if (process.env.NODE_ENV === "production" || !process.env.DEV_JOB_FILE) notFound();
  const job = JSON.parse(readFileSync(process.env.DEV_JOB_FILE, "utf8"));
  return <main className="wrap app-main"><Editor initial={job} mediaUrl="/dev-media.mp4" /></main>;
}
