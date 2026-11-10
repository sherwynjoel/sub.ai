/**
 * The clip on the home page's styles phone (public/home/phone-clip.mp4, muted; Sudhir Srinivasan's interview with
 * Riya Shibu, used with permission). `cues` are Vasanamm's own subtitles for it, played in whichever style is picked.
 */
export type PhoneCue = { start: number; end: number; text: string; sub: string };

export const PHONE_CLIP: { src: string; poster: string; cues: PhoneCue[] } = {
  src: "/home/phone-clip.mp4",
  poster: "/home/phone-clip.webp",
  // Made by Vasanamm (Sarvam saaras:v4, Tamil, spoken + English) on 10 Nov 2026. Only changes: one Malayalam letter
  // in the dialogue line written in Tamil (லே), and the English line kept only under lines that aren't English already.
  cues: [
    { start: 0.00, end: 2.71, text: "Actually one of the dialogues because I am", sub: "" },
    { start: 2.71, end: 6.83, text: "quite unserious so this one dialogue that", sub: "" },
    { start: 6.83, end: 9.71, text: "I was delivering I was laughing a lot so", sub: "" },
    { start: 9.71, end: 12.10, text: "but then that dialogue is.", sub: "" },
    { start: 12.05, end: 13.05, text: "Viral right now.", sub: "" },
    { start: 13.05, end: 16.97, text: "It's the one where I am like saying when", sub: "" },
    { start: 16.97, end: 18.29, text: "you have a partner in your life,", sub: "" },
    { start: 18.29, end: 19.73, text: "நம்ம life-ஏ சந்தோஷமாயிடும்.", sub: "our life will be happy." },
    { start: 19.73, end: 23.82, text: "அண்ட் அண்ணத்த ஒரு partner உண்டாவனது நல்லதல்லே?", sub: "And isn't it good to have such a partner?" },
    { start: 23.61, end: 26.31, text: "So saying talking about the partner.", sub: "" },
    { start: 26.31, end: 28.65, text: "But I laughed a lot.", sub: "" },
    { start: 28.65, end: 29.67, text: "And also like.", sub: "" },
    { start: 29.62, end: 31.24, text: "Nivin Pauly coming and sitting in front of", sub: "" },
    { start: 31.24, end: 33.70, text: "me and then I am saying this dialogue and", sub: "" },
    { start: 33.70, end: 36.60, text: "he is like really?", sub: "" },
    { start: 36.60, end: 37.60, text: "Oh so then.", sub: "" },
    { start: 37.60, end: 39.12, text: "Thank you for educating me.", sub: "" },
    { start: 39.12, end: 41.56, text: "Yeah so that dialogue is actually really", sub: "" },
    { start: 41.56, end: 44.34, text: "nice but then I was very unserious and I", sub: "" },
    { start: 44.34, end: 47.04, text: "was just like man really.", sub: "" },
    { start: 46.99, end: 51.01, text: "So that's one portion where I was feeling", sub: "" },
    { start: 51.01, end: 52.95, text: "really unserious when I was like", sub: "" },
    { start: 52.95, end: 54.11, text: "delivering the dialogue.", sub: "" },
    { start: 54.11, end: 55.83, text: "But then eventually we got it right and it", sub: "" },
    { start: 55.83, end: 57.35, text: "was it was nice.", sub: "" },
    { start: 57.30, end: 60.10, text: "But then any other points where I felt no", sub: "" },
    { start: 60.10, end: 61.06, text: "no I didn't feel any.", sub: "" },
    { start: 61.06, end: 62.32, text: "Not really. No no.", sub: "" },
    { start: 62.32, end: 64.36, text: "But then there was random points where I", sub: "" },
    { start: 64.36, end: 67.92, text: "didn't I didn't know that I'll feel so", sub: "" },
    { start: 67.92, end: 69.96, text: "oddly connected to the character which", sub: "" },
    { start: 69.96, end: 72.75, text: "like surprised me right.", sub: "" },
  ],
};
