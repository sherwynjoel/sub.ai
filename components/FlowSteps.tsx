"use client";

/** The steps from a video to captioned video, the one the user is on marked (the ones before ticked). */
export const FLOW = ["Video", "Captions", "Style", "Edit", "Export"] as const;

export default function FlowSteps({ at, onStep }: { at: number; onStep?: (i: number) => void }) {
  return (
    <ol className="flow-steps" aria-label="Steps">
      {FLOW.map((name, i) => {
        const state = i < at ? "done" : i === at ? "now" : "next";
        const go = onStep && i < at ? () => onStep(i) : undefined;
        return (
          <li key={name} className={`flow-step ${state}`} aria-current={state === "now" ? "step" : undefined}>
            {go ? <button type="button" onClick={go} title={`Back to ${name}`}><i>✓</i><span>{name}</span></button> : <span className="fs-in"><i>{state === "done" ? "✓" : i + 1}</i><span>{name}</span></span>}
          </li>
        );
      })}
    </ol>
  );
}
