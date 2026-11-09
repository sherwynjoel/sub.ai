import ConfirmEmail from "@/components/ConfirmEmail";
import Dashboard from "@/components/Dashboard";
import TrialPass from "@/components/TrialPass";
import { requireUser } from "@/lib/auth";
import { passEnd, secondsLeft } from "@/lib/plans";
import { mustConfirm } from "@/lib/verify";

export default async function Page() {
  const u = await requireUser();
  // Someone on the trial, once its minutes have really started (a lapsed paid plan doesn't count).
  const trial = u.plan === "free" && secondsLeft(u) > 0 && !(await mustConfirm(u));
  return (
    <>
      <header className="dash-head">
        <h1 className="page-title">Projects</h1>
        <p className="muted">Upload a video, choose how the captions read, then edit and export.</p>
      </header>
      <ConfirmEmail />
      <Dashboard />
      {trial && <TrialPass holder={u.name} passNo={u.id.slice(0, 8).toUpperCase()} until={passEnd(u)?.toISOString()} />}
    </>
  );
}
