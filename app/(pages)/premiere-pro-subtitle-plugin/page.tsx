import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

const path = "/premiere-pro-subtitle-plugin";
export const metadata: Metadata = {
  title: "Premiere Pro subtitle plugin for Tamil and Indian languages",
  description: "A Premiere Pro and After Effects panel that puts timed Tamil, Indian-language and English subtitles on your timeline, as a caption track or 24 animated templates.",
  alternates: { canonical: path },
};

export default function Page() {
  return (
    <GuidePage
      path={path}
      h1="Premiere Pro subtitle plugin for Tamil and Indian languages"
      lead="Select a clip, choose the language and click Generate: the Vasanam panel puts timed subtitles on your Premiere Pro timeline, lined up with the clip wherever it sits."
      points={[
        ["Caption track or animated text", "Use Premiere's own caption track, or 24 animated caption templates (typewriter, glow, three-word stacks and more) placed caption by caption."],
        ["Edit inside Premiere", "Change the wording, size, colour, position and lines in the panel, then update the timeline in one click."],
        ["After Effects too", "In After Effects the panel adds timed text layers with your chosen font, size and colours."],
        ["22 languages plus English", "Tamil, Hindi, Telugu, Malayalam, Kannada and more, with an English line or a full English translation."],
      ]}
      steps={[
        "Create a free account and download the panel from the Plugin page.",
        "Install it with the ZXP Installer, open Window → Extensions → Vasanam, and paste your key.",
        "Select a clip on the timeline, pick the language and style, and click Generate subtitles.",
      ]}
      faq={[
        ["Which versions does it support?", "Premiere Pro and After Effects 2022 and newer. A few of the animated templates need Premiere Pro 2026."],
        ["Is there a DaVinci Resolve version?", "Yes, a script for DaVinci Resolve is on the Plugin page."],
        ["Does the panel upload my whole project?", "No, only the media file of the clip you select, which is deleted from our server after 7 days."],
        ["How much does it cost?", "15 minutes free, then plans from ₹499 a month. The panel is included in every plan."],
      ]}
    />
  );
}
