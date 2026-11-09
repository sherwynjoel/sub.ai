import { readFileSync } from "node:fs";
import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Editor from "@/components/Editor";
import "@/app/app/app.css";

/** Development only: the editor inside the app's own header and footer (as /app/jobs/:id), to test the phone layout. */
export default function Page() {
  if (process.env.NODE_ENV === "production" || !process.env.DEV_JOB_FILE) notFound();
  const job = JSON.parse(readFileSync(process.env.DEV_JOB_FILE, "utf8"));
  return (
    <>
      <AppHeader brand="Vasanamm" isAdmin={false} seconds={900} meter={60} plan="Free" help="#" />
      <main className="wrap app-main"><Editor initial={job} mediaUrl="/dev-media.mp4" /></main>
      <footer className="wrap app-foot"><span className="muted small">Need help?</span></footer>
    </>
  );
}
