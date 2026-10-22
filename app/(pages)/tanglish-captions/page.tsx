import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

const path = "/tanglish-captions";
export const metadata: Metadata = {
  title: "Tanglish captions: Tamil subtitles in English letters",
  description: "Turn Tamil and code-mixed speech into Tanglish captions (Tamil in English letters) for Reels, Shorts and YouTube. Edit, style and export. 15 minutes free.",
  alternates: { canonical: path },
};

export default function Page() {
  return (
    <GuidePage
      path={path}
      h1="Tanglish captions for Reels, Shorts and YouTube"
      lead="Many viewers read Tamil faster in English letters. Vasanam writes what is said in Tanglish, keeps the English words as English, and times every line to the speech."
      points={[
        ["Written the way it's said", "“Machi, indha edit semma!” stays exactly that: Tamil in English letters, English words untouched."],
        ["Made for short videos", "Styles built for Reels and Shorts, word-by-word highlights, and safe zones that keep captions clear of the app's buttons."],
        ["Choose your script", "Tanglish, Tamil script with English words as English, Tamil script only, or a full English translation."],
        ["Straight into your edit", "Download SRT for any editor, or use the Premiere Pro and After Effects panel to put the captions on your timeline."],
      ]}
      steps={[
        "Upload your video and pick “Roman letters (Tanglish)”.",
        "Pick a caption style and a safe zone for Reels, Shorts or TikTok.",
        "Fix any word in the editor, then export an MP4 or download SRT.",
      ]}
      faq={[
        ["What is Tanglish?", "Tamil written in English letters, the way most people type Tamil on their phones, often with English words mixed in."],
        ["Can I switch to Tamil script later?", "The script is chosen when you upload. To get both, upload the video again with the other script; your free minutes cover short clips."],
        ["Do the captions work on Instagram and YouTube Shorts?", "Yes. Export a 9:16 MP4 with the captions burned in, with the Instagram Reels or YouTube Shorts safe zone so nothing hides behind the buttons."],
        ["Is there a free trial?", "Yes, 15 minutes of video free, with no card needed."],
      ]}
    />
  );
}
