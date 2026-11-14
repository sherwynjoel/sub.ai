import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

const path = "/tamil-to-english-subtitles";
export const metadata: Metadata = {
  title: "Tamil to English subtitles: translate any Tamil video",
  description: "Turn a Tamil video into English subtitles, timed to the speech. Keep the Tamil line above the English, or English only. Edit, download SRT or VTT, or burn them into an MP4. Plans from ₹499.",
  alternates: { canonical: path },
};

export default function Page() {
  return (
    <GuidePage
      path={path}
      h1="Tamil to English subtitles"
      lead="Upload a Tamil video and get English subtitles timed to what is said, so viewers who don't speak Tamil can follow every line."
      points={[
        ["English that sounds natural", "Each line is translated as a sentence, not word by word, so jokes, slang and Tanglish read the way a person would say them in English."],
        ["Tamil and English together, or English only", "Show the Tamil line with the English under it on the same timing, or choose English only for viewers outside Tamil Nadu and abroad."],
        ["Going the other way", "Have an English video? Choose “Translate to Tamil” and the captions are written in Tamil."],
        ["Edit everything", "Fix a word, retime a line on the timeline, split or merge subtitles, and pick from 45 caption styles, then change their fonts, colours and size."],
        ["Every format you need", "Download SRT, WebVTT or plain text, or export an MP4 with the subtitles burned in, from 480p up to 4K, with presets for YouTube, Reels and WhatsApp."],
      ]}
      steps={[
        "Create an account, pick a plan and upload your Tamil video (MP4, MOV, MKV, MP3 or WAV, up to 4 GB).",
        "Choose Tamil, then English only, or Tamil with English underneath.",
        "Read the English in the editor and fix any line you like.",
        "Download the SRT for YouTube or the finished MP4.",
      ]}
      faq={[
        ["Is there a free trial?", "Not right now. Plans start at ₹499 for 30 days and 300 minutes."],
        ["Can I upload the English subtitles to YouTube?", "Yes. Download the SRT and add it in YouTube Studio as English subtitles, so viewers can switch them on."],
        ["Does it understand Tanglish?", "Yes. Mixed Tamil and English speech is understood as said, and the English line reads naturally."],
        ["Can I translate into other languages?", "Yes. In the editor, Translate turns the captions into any of 22 Indian languages, or English."],
        ["How accurate is it?", "Clear speech comes out well, but it is made by AI, so read the subtitles before you publish. Everything can be corrected in the editor."],
        ["What happens to my video?", "Your video stays on your device: only the sound is sent to us, to make your subtitles, and it is deleted automatically after 7 days. Your subtitles stay in your account until you delete them."],
      ]}
    />
  );
}
