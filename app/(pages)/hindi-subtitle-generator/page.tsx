import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

const path = "/hindi-subtitle-generator";
export const metadata: Metadata = {
  title: "Hindi subtitle generator: Hindi and English subtitles from any video",
  description: "Upload a Hindi video and get timed Hindi subtitles with an English translation. Hinglish (Hindi mixed with English) stays as spoken. Edit in the browser, download SRT or VTT, or burn them into an MP4. 15 minutes free.",
  alternates: { canonical: path },
};

export default function Page() {
  return (
    <GuidePage
      path={path}
      h1="Hindi subtitle generator"
      lead="Upload a video in Hindi and get timed Hindi subtitles with an English line under each one, ready to edit, download or burn into the video."
      points={[
        ["Hindi the way people speak it", "Hinglish (Hindi mixed with English) stays as it was said: English words stay in English inside the Hindi line, instead of being forced into Hindi spellings. Prefer one script? Choose “Pure Hindi”."],
        ["English translation included", "Each subtitle gets an English line on the same timing, or choose English only for viewers who don't read Hindi."],
        ["Hindi in English letters", "Choose “Hindi in English letters” and the Hindi is written the way people type it in chats."],
        ["Edit everything", "Fix a word, retime a line on the timeline, split or merge subtitles, and pick from 45 caption styles, then change their fonts, colours and size."],
        ["Every format you need", "Download SRT, WebVTT or plain text, or export an MP4 with the subtitles burned in, from 480p up to 4K, with presets for YouTube, Reels and WhatsApp."],
      ]}
      steps={[
        "Create a free account and upload your video (MP4, MOV, MKV, MP3 or WAV, up to 4 GB).",
        "Choose Hindi, and whether you want Hindi + English, Hindi in English letters, pure Hindi or English only.",
        "Check the subtitles in the editor, fix anything you like and pick a style.",
        "Download the subtitle file or the finished MP4.",
      ]}
      faq={[
        ["Is it free?", "The first 15 minutes of video are free, with no card needed. After that, plans start at ₹499 for 30 days and 300 minutes."],
        ["Does it handle Hinglish (Hindi mixed with English)?", "Yes. Mixed speech is written as spoken: Hindi words in Hindi script, English words in English."],
        ["Can I add the subtitles to YouTube?", "Yes. Download the SRT and add it in YouTube Studio, or export the MP4 with the subtitles burned in."],
        ["How accurate is it?", "Clear speech comes out well, but it is made by AI, so read the subtitles before you publish. Everything can be corrected in the editor."],
        ["Does it work in Premiere Pro?", "Yes. The Vasanamm panel for Premiere Pro and After Effects is included in every plan: pick a clip, press Generate, and get a caption track."],
        ["What happens to my video?", "Your video stays on your device: only the sound is sent to us, to make your subtitles, and it is deleted automatically after 7 days. Your subtitles stay in your account until you delete them."],
      ]}
    />
  );
}
