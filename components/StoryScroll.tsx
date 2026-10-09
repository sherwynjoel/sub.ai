"use client";
import { useEffect, useRef, useState } from "react";

const STEPS = [
  { title: "Upload your cut", body: "Drop an MP4, MOV, MKV or audio file up to 4 GB, from the website or straight from Premiere Pro." },
  { title: "Vasanam listens", body: "The dialogue is transcribed in Tamil script and translated to English, both on the same timing." },
  { title: "Fix any line", body: "Tamil and English sit side by side with the video. Change a word or nudge a timing; it plays back instantly." },
  { title: "Ship it", body: "Download SRT, VTT or text, or send a caption track straight to your Premiere Pro sequence." },
];

/** What the editor shows at each step. */
function State({ i }: { i: number }) {
  if (i === 0)
    return (
      <>
        <div className="drop">
          <span className="drop-icon" />
          <b>Drop a video here</b>
          <span>MP4, MOV, MKV, MP3 or WAV up to 4 GB</span>
        </div>
        <div className="file">
          <span className="file-name">interview_A_cam.mov</span>
          <span className="file-size">1.8 GB</span>
          <span className="bar"><i style={{ width: "68%" }} /></span>
        </div>
      </>
    );
  if (i === 1)
    return (
      <>
        <b className="state-title">Writing subtitles</b>
        <span className="bar"><i style={{ width: "64%" }} /></span>
        <ul className="lines">
          <li><span lang="ta">நீ சொன்னது எல்லாம் உண்மைதானா?</span><span>Was everything you said true?</span></li>
          <li><span lang="ta">சத்தியமா, ஒரு வார்த்தை கூட பொய் இல்லை.</span><span>I swear, not a single word was a lie.</span></li>
          <li className="pending"><span /><span /></li>
        </ul>
      </>
    );
  if (i === 2)
    return (
      <ul className="lines edit">
        <li><span className="tc">00:01:12,400</span><span lang="ta">நீ சொன்னது எல்லாம் உண்மைதானா?</span><span>Was everything you said true?</span></li>
        <li className="editing"><span className="tc">00:01:15,050</span><span lang="ta">சத்தியமா, ஒரு வார்த்தை கூட பொய் இல்லை<i className="caret" /></span><span>I swear, not a single word was a lie.</span></li>
        <li><span className="tc">00:01:18,900</span><span lang="ta">அப்போ நாளைக்கு எல்லார் முன்னாடியும் சொல்லு.</span><span>Then say it tomorrow, in front of everyone.</span></li>
      </ul>
    );
  return (
    <>
      <b className="state-title">Export</b>
      <ul className="exports">
        <li className="on"><span>Tamil + English</span><span className="tc">.srt</span></li>
        <li><span>Tamil</span><span className="tc">.vtt</span></li>
        <li><span>English</span><span className="tc">.txt</span></li>
        <li><span>Premiere Pro caption track</span><span className="check" /></li>
      </ul>
    </>
  );
}

/** The editor window frame shared with the hero shot. */
function Window({ children, step }: { children: React.ReactNode; step?: number }) {
  return (
    <div className="story-panel" data-step={step}>
      <div className="shot-bar">
        <span className="dots"><i /><i /><i /></span>
        <span className="shot-title">interview_A_cam.mov</span>
      </div>
      <div className="story-states">{children}</div>
    </div>
  );
}

/**
 * "How it works": on wide screens the editor panel stays pinned while the steps scroll past and the panel changes state;
 * on narrow screens each step carries its own panel inline.
 */
export default function StoryScroll() {
  const [step, setStep] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setStep(Number((e.target as HTMLElement).dataset.i))),
      { rootMargin: "-45% 0px -45% 0px" },
    );
    refs.current.forEach((el) => el && io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="story">
      <ol className="story-steps">
        {STEPS.map((s, i) => (
          <li key={s.title} data-i={i} ref={(el) => { refs.current[i] = el; }} className={i === step ? "on" : undefined}>
            <span className="story-n">{i + 1}</span>
            <h3>{s.title}</h3>
            <p>{s.body}</p>
            <div className="story-inline" aria-hidden="true">
              <Window><div className="state shown"><State i={i} /></div></Window>
            </div>
          </li>
        ))}
      </ol>
      <div className="story-stage" aria-hidden="true">
        <Window step={step}>
          {STEPS.map((s, i) => <div key={s.title} className={`state s${i}`}><State i={i} /></div>)}
        </Window>
      </div>
    </div>
  );
}
