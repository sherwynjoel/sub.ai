import Dashboard from "@/components/Dashboard";

export default function Page() {
  return (
    <>
      <header className="dash-head">
        <h1 className="page-title">Projects</h1>
        <p className="muted">Upload a video, choose how the captions read, then edit and export.</p>
      </header>
      <Dashboard />
    </>
  );
}
