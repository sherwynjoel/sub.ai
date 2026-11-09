import { notFound } from "next/navigation";
import AppHeader from "@/components/AppHeader";
import Dashboard from "@/components/Dashboard";
import "@/app/app/app.css";

/** Development only: the projects page (its API calls answered by the test, or failing), to try the new-project flow. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <><AppHeader brand="Vasanamm" isAdmin={false} seconds={900} meter={60} plan="Free" help="#" /><main className="wrap app-main"><header className="dash-head"><h1 className="page-title">Projects</h1><p className="muted">Upload a video, choose how the captions read, then edit and export.</p></header><Dashboard /></main></>;
}
