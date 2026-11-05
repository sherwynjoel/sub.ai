import { notFound } from "next/navigation";
import Dashboard from "@/components/Dashboard";
import "@/app/app/app.css";

/** Development only: the projects page (its API calls answered by the test, or failing), to try the new-project flow. */
export default function Page() {
  if (process.env.NODE_ENV === "production") notFound();
  return <main className="wrap app-main"><Dashboard /></main>;
}
