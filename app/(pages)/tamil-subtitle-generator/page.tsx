import type { Metadata } from "next";
import GuidePage from "@/components/GuidePage";

const path = "/tamil-subtitle-generator";
export const metadata: Metadata = {
  title: "Tamil subtitle generator: Tamil and English subtitles from any video",
  description: "Upload a Tamil video and get timed Tamil subtitles with an English translation. Edit them in the browser, download SRT or VTT, or burn them into an MP4. 15 minutes free.",
  alternates: { canonical: path },
};

export default function Page() {
  return (
    <GuidePage
      path={path}
      h1="Tamil subtitle generator"
      lead="Upload a video in Tamil and get timed Tamil subtitles with an English line under each one, ready to edit, download or burn into the video."
      points={[
        ["Tamil the way people speak it", "Code-mixed speech stays as it was said: English words like “patients” or “acne” stay in English inside the Tamil line, instead of being forced into Tamil spellings."],
        ["English translation included", "Each subtitle gets an English line, or choose a full English translation on its own for viewers outside Tamil Nadu."],
        ["Edit everything", "Fix a word, retime a line on the timeline, split or merge subtitles, change fonts (Tamil fonts included), colours and position, then save."],
        ["Every format you need", "Download SRT, WebVTT or plain text, or export an MP4 with the subtitles burned in, in 9:16, 1:1, 4:5 or 16:9."],
      ]}
      steps={[
        "Create a free account and upload your video (MP4, MOV, MKV, MP3 or WAV, up to 4 GB).",
        "Choose Tamil, and whether you want Tamil + English, Tamil only or English only.",
        "Check the subtitles in the editor, fix anything you like and pick a style.",
        "Download the subtitle file or the finished MP4.",
      ]}
      faq={[
        ["Is it free?", "The first 15 minutes of video are free, with no card needed. After that, plans start at ₹499 a month for 300 minutes."],
        ["Can it write Tamil in English letters (Tanglish)?", "Yes. Choose “Roman letters (Tanglish)” when you upload, and the Tamil is written in English letters."],
        ["Does it work for other Indian languages?", "Yes: Hindi, Telugu, Malayalam, Kannada, Bengali, Marathi and 15 more, each with English."],
        ["How accurate is it?", "Clear speech comes out well, but it is made by AI, so read the subtitles before you publish. Everything can be corrected in the editor."],
        ["What happens to my video?", "It is used only to make your subtitles and is deleted automatically after 7 days. Your subtitles stay in your account until you delete them."],
      ]}
    />
  );
}
