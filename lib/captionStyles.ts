/**
 * Caption styles: one definition drives both the live preview (components/StyledCaption.tsx)
 * and the burned-in MP4 (ASS subtitles rendered by ffmpeg/libass in the worker).
 * Sizes are fractions of the font size; colours are #RRGGBB or #RRGGBBAA.
 * Fonts live in public/caption-fonts (family names below must match the files).
 */
import type { Cue } from "@/db";
import { breakLines, lineBreaks } from "@/lib/subtitles";
import { lineScale, looksTall, textWidth } from "@/lib/fontWidths";

export type TextAlign = "left" | "center" | "right";
export type Effect = "punch" | "solo" | "vhs" | "typewriter" | "crawl" | "wobble" | "stack" | "hook" | "corners" | "oneword" | "typo" | "cine";
/** How a caption comes in (the last few from the Premiere template pack's presets). */
export const ANIMS = {
  none: "None", fade: "Fade in", pop: "Pop", slide: "Slide up", bounce: "Bounce", zoom: "Zoom in",
  blur: "Blur in", flicker: "Flicker", flicker2: "Strong flicker", ramp: "Ramp up", snap: "Snap", bouncyout: "Bounce, fade out", wordin: "Word by word",
  cinematic: "Cinematic (zoom out of a blur)",
} as const;
export type Anim = keyof typeof ANIMS;
/** How the word being said stands out. */
export const HIGHLIGHTS = { style: "The style's own", none: "None", color: "Colour", box: "Box", underline: "Underline", grow: "Grow" } as const;
export type Highlight = keyof typeof HIGHLIGHTS;
export type CaptionStyle = {
  id: string; name: string; group: "Typography" | "Templates" | "Premiere" | "Bold" | "Soft" | "Simple" | "Playful"; blurb: string;
  font: string; size?: number; bold?: boolean; italic?: boolean; caps?: boolean; lower?: boolean;
  fontTa?: string;               // font for Tamil letters (the Latin fonts have none); unset = Noto Sans Tamil
  color: string;                 // spoken and already-spoken words
  future?: string | null;        // words not yet spoken; null = hidden until spoken; omitted = same as color
  active?: string;               // the word being spoken
  mark?: string;                 // highlighter swipe behind the word being spoken
  underline?: boolean;           // underline the word being spoken
  keyword?: { color?: string; grow?: boolean; font?: string; italic?: boolean; scale?: number; line?: boolean }; // scale: size (em); line: on a line of its own
  reveal?: "rise" | "letters" | "flicker";
  wordLines?: boolean;           // every word on a line of its own // each word (or letter) comes in as it's said, in its final place: rising, rising letter by letter, flickering
  outline?: [string, number];    // colour, width
  shadow?: number;
  box?: string;                  // solid card behind the line
  effect?: Effect;
  stack?: { big: string; font: string; glow?: boolean; rgb?: boolean }; // "stack": the big middle word's colour and font, glowing / split into colours
  hook?: { sizes: number[]; colors: string[]; fonts?: (string | undefined)[] }; // "hook": each line's size (em), colour and font, in turn
  spacing?: number;              // letter spacing, em
  lineHeight?: number;           // space between lines: × the font's own line height (1 = as the font sets it)
  textAlign?: TextAlign;         // lines flush left / centred / flush right (the caption against that side of the safe zone)
  gradient?: [string, string];   // the text filled top colour → bottom colour, each line
  opacity?: number;              // 0-1
  rotate?: number;               // degrees, clockwise
  shadowColor?: string;
  boxPad?: number;               // background padding, em
  anim?: Anim;                   // entrance
  activeGrow?: boolean;          // the word being said grows
  glow?: string;                 // soft coloured glow around the letters
};

const GOLD = "#FFC83D", BUTTER = "#FFE58A", CREAM = "#FFF4D6", INK = "#141414", HL = "#FFE14D";
const W = "#FFFFFF";

export const CAPTION_STYLES: CaptionStyle[] = [
  // The CINECUT short-form typography project (Premiere), matched frame by frame: its Helvetica Neue becomes Inter,
  // its Open Sauce Sans Black (OFL) is bundled.
  { id: "cc-word-cut", name: "Word Cut", group: "Typography", blurb: "One big word at a time, cut on the beat.", font: "Playfair Display Bold Italic", fontTa: "Hind Madurai", size: 1.13, color: W, shadow: 0.04, effect: "oneword" },
  { id: "cc-cinematic", name: "Cinematic", group: "Typography", blurb: "Three lines narrowing down: the outer ones in rounded Comfortaa, the middle one big Poppins capitals; each word settles out of a soft blur as it's said.", font: "Comfortaa Bold", fontTa: "Hind Madurai", size: 1.06, color: W, shadow: 0.04, anim: "cinematic", effect: "cine" },
  { id: "cc-rise", name: "Rise Up", group: "Typography", blurb: "Each word fades in, rising into place as it's said.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, reveal: "rise" },
  { id: "cc-rise-spaced", name: "Rise Spaced", group: "Typography", blurb: "Airy, spaced-out words rising in one by one.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, spacing: 0.05, reveal: "rise" },
  { id: "cc-corners", name: "Corner Block", group: "Typography", blurb: "Small capitals pinned to a block's edges, popping on one by one.", font: "Inter", fontTa: "Hind Madurai", size: 0.96, caps: true, color: W, shadow: 0.04, effect: "corners" },
  { id: "cc-bold-flicker", name: "Bold Flicker", group: "Typography", blurb: "Big capitals that strobe on, word by word.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 0.96, caps: true, color: W, shadow: 0.04, reveal: "flicker", wordLines: true },
  { id: "cc-letter-rise", name: "Letter Rise", group: "Typography", blurb: "Letters rise in one by one around a huge black keyword.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, reveal: "letters", keyword: { font: "Open Sauce Sans Black", scale: 1.57, line: true } },
  { id: "cc-typo-block", name: "Typo Block", group: "Typography", blurb: "Small and big words mixed in a block, each rising in.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, effect: "typo", reveal: "rise" },
  // The Premiere template pack (Drive): its presets, its Reels text and its hooks, remade from our parts. Its
  // Helvetica / Neue Haas Grotesk (commercial) become Inter Bold, Helvetica Rounded becomes Nunito ExtraBold.
  { id: "tpl-blur", name: "Blur Animation", group: "Templates", blurb: "Bold orange that sharpens out of a blur.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#FF7800", shadow: 0.05, anim: "blur" },
  { id: "tpl-bounce", name: "Bounce Text", group: "Templates", blurb: "Bold red that bounces in.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#FF0000", shadow: 0.05, anim: "bounce" },
  { id: "tpl-bouncy-fadeout", name: "Bouncy Fadeout", group: "Templates", blurb: "Rounded pink that bounces in and fades away.", font: "Nunito ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.16, color: "#FE006C", shadow: 0.05, anim: "bouncyout" },
  { id: "tpl-fade-up", name: "Fade Animation", group: "Templates", blurb: "Bold orange that fades up into place.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#FF7800", shadow: 0.05, anim: "slide" },
  { id: "tpl-flicker", name: "Flicker Text", group: "Templates", blurb: "Clean white that flickers on.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.06, anim: "flicker" },
  { id: "tpl-ramp-up", name: "Ramp Up", group: "Templates", blurb: "Bold purple that shoots up into place.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#8100EF", shadow: 0.08, shadowColor: "#FFFFFF", anim: "ramp" },
  { id: "tpl-snapping", name: "Snapping Text", group: "Templates", blurb: "Red that snaps into place.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: "#FF0000", shadow: 0.06, anim: "snap" },
  { id: "tpl-strong-flicker", name: "Strong Flicker", group: "Templates", blurb: "Bold red that flickers hard before it settles.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#FF0000", shadow: 0.05, anim: "flicker2" },
  { id: "tpl-word-by-word", name: "Word by Word", group: "Templates", blurb: "Bold red, each word blurring in as it's said.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: "#FF0000", shadow: 0.05, anim: "wordin" },
  { id: "tpl-reels-glow", name: "Reels Glow", group: "Templates", blurb: "Small white words around one big red word that glows.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, effect: "stack", stack: { big: "#FA0404", font: "Inter Bold", glow: true } },
  { id: "tpl-reels-rgb", name: "Reels RGB", group: "Templates", blurb: "The glowing red word, split into colours.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, effect: "stack", stack: { big: "#FA0404", font: "Inter Bold", glow: true, rgb: true } },
  { id: "tpl-reels-simple", name: "Reels Simple", group: "Templates", blurb: "Small white words around one big red word.", font: "Inter", fontTa: "Hind Madurai", size: 1.1, color: W, shadow: 0.04, effect: "stack", stack: { big: "#FA0404", font: "Inter Bold" } },
  { id: "tpl-hook-yellow", name: "Hook Yellow", group: "Templates", blurb: "Hook lines in four sizes, one in yellow, popping in one by one.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: W, shadow: 0.05, effect: "hook", hook: { sizes: [0.49, 1.63, 1.22, 0.65], colors: [W, W, "#FFED00", W] } },
  { id: "tpl-hook-cyan", name: "Hook Cyan", group: "Templates", blurb: "Hook lines in white, cyan and lime, popping in one by one.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: W, shadow: 0.05, effect: "hook", hook: { sizes: [0.96, 1.6, 0.56, 0.88], colors: [W, "#00FFD7", W, "#F0FF00"] } },
  { id: "tpl-hook-neon", name: "Hook Neon", group: "Templates", blurb: "Hook lines in cyan, white, yellow and red.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: W, shadow: 0.05, effect: "hook", hook: { sizes: [0.66, 1.51, 1.04, 0.8], colors: ["#00FFE6", W, "#F3FF00", "#FF2A2A"] } },
  { id: "tpl-hook-big-start", name: "Hook Big Start", group: "Templates", blurb: "A huge first word, then cyan, white and a yellow script line.", font: "Inter Bold", fontTa: "Mukta Malar ExtraBold", size: 1.1, color: W, shadow: 0.05, effect: "hook", hook: { sizes: [1.73, 0.93, 0.47, 0.87], colors: [W, "#00F9FF", W, "#F3FF00"], fonts: [undefined, undefined, undefined, "Playfair Display Bold Italic"] } },
  // The Premiere Pro panel's templates, made from the web styles' parts (fonts, colours, glow, motion).
  { id: "pr-butter-up", name: "Butter Up", group: "Premiere", blurb: "Flowing white script that slides up into place.", font: "Satisfy", fontTa: "Kavivanar", size: 1.24, color: "#FFFFFF", shadow: 0.06, anim: "slide" },
  { id: "pr-cracked", name: "Cracked", group: "Premiere", blurb: "Heavy silver letters with a red glow; the keyword hits red.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 0.99, caps: true, color: "#E9E9EE", glow: "#FF1E2D", keyword: { color: "#FF2A2A", grow: true }, anim: "pop" },
  { id: "pr-energetic-1", name: "Energetic 1", group: "Premiere", blurb: "Bold white with a soft glow; each caption bounces in.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", glow: "#FFFFFF", anim: "bounce" },
  { id: "pr-energetic-2", name: "Energetic 2", group: "Premiere", blurb: "Bold white that pops in, the spoken word grows.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", shadow: 0.06, anim: "pop", activeGrow: true },
  { id: "pr-energetic-3", name: "Energetic 3", group: "Premiere", blurb: "Bold white that zooms in with a drop shadow.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", shadow: 0.08, anim: "zoom" },
  { id: "pr-god-rays", name: "God Rays", group: "Premiere", blurb: "Bright green with a green glow, fading in like light.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#3BE04A", glow: "#3BE04A", anim: "fade" },
  { id: "pr-santhosham", name: "Santhosham", group: "Premiere", blurb: "Big heavy white with a deep shadow, zooming in.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#F2F2F2", shadow: 0.12, anim: "zoom" },
  { id: "pr-text-break", name: "Text Break", group: "Premiere", blurb: "Red condensed caps that break in and shake.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: "#E8202A", outline: ["#FFFFFF", 0.04], shadow: 0.07, anim: "bounce", effect: "wobble" },
  { id: "pr-typewriter", name: "Typewriter", group: "Premiere", blurb: "Bold white typed out letter by letter (Typewriter 01–07).", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#FFFFFF", shadow: 0.05, effect: "typewriter" },
  { id: "pr-typewriter-lime", name: "Typewriter Lime", group: "Premiere", blurb: "Typed out in glowing lime (Typewriter 08).", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#C6FF1A", glow: "#C6FF1A", effect: "typewriter" },
  { id: "pr-typewriter-pink", name: "Typewriter Pink", group: "Premiere", blurb: "Typed out in glowing pink (Typewriter 09 and 12).", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#FF2E7E", glow: "#FF2E7E", effect: "typewriter" },
  { id: "pr-typewriter-sky", name: "Typewriter Sky", group: "Premiere", blurb: "Typed out in glowing sky blue (Typewriter 10 and 14).", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#5BC8FF", glow: "#2EE6FF", effect: "typewriter" },
  { id: "pr-typewriter-green", name: "Typewriter Green", group: "Premiere", blurb: "Typed out in glowing green (Typewriter 11 and 13).", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#39FF14", glow: "#39FF14", effect: "typewriter" },
  { id: "pr-zoom-in", name: "Zoom In", group: "Premiere", blurb: "Heavy cyan with a bright glow, zooming in.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#2EE6FF", glow: "#2EE6FF", anim: "zoom" },
  { id: "setup-punch", name: "Setup & Punch", group: "Bold", blurb: "A quiet lead-in, then the last words land big, one by one.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", future: null, shadow: 0.05, effect: "punch" },
  { id: "comic-pop", name: "Comic Pop", group: "Bold", blurb: "Comic caps with a black ring; the keyword turns gold and grows.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 0.99, caps: true, color: "#FFFFFF", outline: ["#000000", 0.09], keyword: { color: GOLD, grow: true } },
  { id: "butter-serif", name: "Butter Script", group: "Bold", blurb: "Soft script with a hairline edge and a butter-yellow keyword.", font: "Satisfy", fontTa: "Kavivanar", size: 1.24, color: "#FFFFFF", outline: ["#000000", 0.03], keyword: { color: BUTTER } },
  { id: "word-box", name: "Word Box", group: "Bold", blurb: "One dark box; words fill in left to right, keyword in gold.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: "#FFFFFF", future: null, box: "#0B0B0BE6", keyword: { color: GOLD } },
  { id: "handwritten", name: "Handwritten", group: "Bold", blurb: "Warm script in a single butter tone that brightens as it's said.", font: "Satisfy", fontTa: "Kavivanar", size: 1.24, bold: true, color: BUTTER, future: "#FFE58A66", shadow: 0.04 },
  { id: "retro-vhs", name: "Tape Glitch", group: "Bold", blurb: "RGB-split tape look with a little tracking jitter.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: "#FFFFFF", effect: "vhs" },
  { id: "trending-1", name: "Trending 1", group: "Bold", blurb: "A few words at a time: one big blue word between small orange lines.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FF8A1F", shadow: 0.06, effect: "stack", stack: { big: "#2E8BFF", font: "Anton" } },
  { id: "trending-2", name: "Trending 2", group: "Bold", blurb: "A big blue script word with heavy orange words above and below.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#FF7A00", shadow: 0.06, effect: "stack", stack: { big: "#3D7BFF", font: "Satisfy" } },
  { id: "trending-3", name: "Trending 3", group: "Bold", blurb: "Small white lines around one big red word.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", shadow: 0.06, effect: "stack", stack: { big: "#FF2D2D", font: "Poppins ExtraBold" } },
  { id: "editorial-cut", name: "Golden Hour", group: "Soft", blurb: "Warm script, every word set; the spoken one wakes up.", font: "Satisfy", fontTa: "Kavivanar", size: 1.24, color: "#FFF1E0", future: "#FFF1E073", active: "#FFD9A0", shadow: 0.04 },
  { id: "soft-display", name: "Soft Display", group: "Soft", blurb: "Lowercase script. Soft, cinematic, premium.", font: "Satisfy", fontTa: "Kavivanar", size: 1.24, lower: true, color: "#F6F0E6", shadow: 0.06 },
  { id: "center-stage", name: "Center Stage", group: "Soft", blurb: "One word at a time, tall and heavy, with the last word above.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: "#FFFFFF", shadow: 0.05, effect: "solo" },
  { id: "marker-swipe", name: "Marker Swipe", group: "Soft", blurb: "Marker type; the spoken word gets a yellow swipe.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 0.99, caps: true, color: "#FFFFFF", active: INK, mark: HL, shadow: 0.04 },
  { id: "spotlight", name: "Sunbeam", group: "Soft", blurb: "A warm beam sweeps across the line as it's spoken.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFE2B0", future: "#FFFFFF59", shadow: 0.05 },
  { id: "highlighter-paper", name: "Notebook", group: "Soft", blurb: "Heavy type on cream paper, underlined as you go.", font: "Satisfy", fontTa: "Kavivanar", size: 1.24, color: INK, future: "#14141480", underline: true, box: CREAM },
  { id: "highlighter-clean", name: "Yellow Swipe", group: "Soft", blurb: "Same swipe, no paper: white before, ink after.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", active: INK, mark: HL, shadow: 0.04 },
  { id: "minimal", name: "Plain Bold", group: "Simple", blurb: "Bold geometric white with a soft shadow. Stays out of the shot.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#FFFFFF", shadow: 0.06 },
  { id: "editorial-mix", name: "Script Twist", group: "Simple", blurb: "Heavy sans; the keyword switches to a script.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#FFFFFF", shadow: 0.05, keyword: { font: "Satisfy", italic: true } },
  { id: "tall-caps", name: "Tall Caps", group: "Simple", blurb: "Tall condensed caps with a blue bar under the spoken word.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: "#FFFFFF", mark: "#2F6BFF", shadow: 0.04 },
  { id: "typewriter", name: "Keystrokes", group: "Simple", blurb: "Types itself out, cursor and all.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#FFFFFF", shadow: 0.05, effect: "typewriter" },
  { id: "eight-bit", name: "Arcade", group: "Playful", blurb: "Tall arcade caps with a thick outline.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.88, color: "#FFFFFF", outline: ["#000000", 0.12], keyword: { color: HL } },
  { id: "doodle-card", name: "Sketch Card", group: "Playful", blurb: "Marker on a paper card; words sit at playful angles.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: INK, box: CREAM, effect: "wobble" },
  { id: "doodle-clean", name: "Sticker", group: "Playful", blurb: "Same marker, sticker edge, no card; keyword in marker yellow.", font: "Roboto Black", fontTa: "Mukta Malar ExtraBold", size: 1.13, color: "#FFFFFF", outline: ["#000000", 0.07], keyword: { color: HL }, effect: "wobble" },
  { id: "crawl", name: "Roll Away", group: "Playful", blurb: "Opening-crawl lines rolling off into the distance.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: HL, effect: "crawl" },
  { id: "mass-title", name: "Mass Title", group: "Bold", blurb: "Big yellow caps with a thick black edge, bouncing in; the keyword hits red.", font: "Anton", fontTa: "Mukta Malar ExtraBold", size: 0.82, caps: true, color: "#FFD60A", outline: ["#000000", 0.1], shadow: 0.08, keyword: { color: "#FF2A2A", grow: true }, anim: "bounce" },
  { id: "neon-aura", name: "Neon Aura", group: "Bold", blurb: "White letters in a violet haze; the keyword glows pink and grows.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#FFFFFF", glow: "#A855F7", keyword: { color: "#FF6AD5", grow: true }, anim: "pop" },
  { id: "frost-glass", name: "Frost Glass", group: "Soft", blurb: "Calm white type on a see-through frosted card.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: "#FFFFFF", box: "#FFFFFF38", boxPad: 0.34, anim: "fade" },
  { id: "flip-card", name: "Flip Card", group: "Simple", blurb: "White with a black edge; the spoken word flips to black on white.", font: "Poppins ExtraBold", fontTa: "Mukta Malar ExtraBold", size: 1.11, color: "#FFFFFF", outline: ["#000000", 0.06], mark: "#FFFFFF", active: INK },
  { id: "lavender-pill", name: "Lavender Pill", group: "Simple", blurb: "Soft lavender card with ink type; the spoken word turns violet.", font: "Poppins", fontTa: "Hind Madurai", size: 1.11, bold: true, color: INK, active: "#6D28D9", box: "#E9DDFF", anim: "slide" },
];

/**
 * The styles offered (pickers, landing page, the panel). The others stay defined so projects already using one
 * keep their look and can still render; they just aren't offered for new looks.
 */
const OFFERED = [
  "cc-word-cut", "cc-cinematic", "cc-rise", "cc-rise-spaced", "cc-corners", "cc-bold-flicker", "cc-letter-rise", "cc-typo-block",
  "tpl-blur", "tpl-bounce", "tpl-bouncy-fadeout", "tpl-fade-up", "tpl-flicker", "tpl-ramp-up", "tpl-snapping", "tpl-strong-flicker",
  "tpl-word-by-word", "tpl-reels-glow", "tpl-reels-rgb", "tpl-reels-simple", "tpl-hook-yellow", "tpl-hook-cyan", "tpl-hook-neon", "tpl-hook-big-start",
  "pr-butter-up", "pr-energetic-2",
  "setup-punch", "comic-pop", "butter-serif", "handwritten", "trending-1", "trending-2", "trending-3", "neon-aura",
  "editorial-cut", "center-stage", "marker-swipe", "spotlight", "highlighter-paper", "highlighter-clean",
  "editorial-mix", "tall-caps", "typewriter", "flip-card",
];
export const STYLE_CHOICES = CAPTION_STYLES.filter((s) => OFFERED.includes(s.id));
/** The groups that have styles on offer, in order. */
export const STYLE_GROUPS = (["Typography", "Templates", "Premiere", "Bold", "Soft", "Simple", "Playful"] as const).filter((g) => STYLE_CHOICES.some((s) => s.group === g));

export const DEFAULT_STYLE = "tall-caps";

/** Fonts users can pick (bundled in public/caption-fonts): the Premiere templates' fonts that are free for the web. */
export const CAPTION_FONTS = [
  "Poppins", "Poppins ExtraBold", "Anton", "Roboto Black", "Satisfy",
  // from the Premiere MOGRT pack (Drive): the free ones, as fixed styles
  "Inter", "Inter Italic", "Montserrat SemiBold", "Playfair Display Italic", "Playfair Display Bold Italic",
  "Inter Bold", "Nunito ExtraBold", // stand-ins for the pack's commercial Helvetica / Neue Haas and Helvetica Rounded
  "Open Sauce Sans Black", // the CINECUT project's keyword font
  // more free fonts (Great Vibes, Figtree and GFS Didot: free look-alikes of the commercial Snell Roundhand, Avenir, Didot)
  "Great Vibes", "Figtree Bold", "GFS Didot", "Oswald Bold", "Bebas Neue", "Lobster", "Pacifico", "Caveat Bold", "Righteous",
  "Archivo Black", "Abril Fatface", "Alfa Slab One", "Comfortaa Bold", "Luckiest Guy", "Titan One",
] as const;
/** The commercial font a free one stands in for (shown in the font menu). */
export const FONT_LIKE: Partial<Record<string, string>> = { "Great Vibes": "Snell", "Figtree Bold": "Avenir", "GFS Didot": "Didot" };

/** Fonts for Tamil letters (bundled in public/caption-fonts; Noto Sans Tamil is also installed on the server). */
export const TAMIL_FONTS = ["Noto Sans Tamil", "Mukta Malar ExtraBold", "Hind Madurai", "Kavivanar", "Pavanam", "Meera Inimai"] as const;

/** A user's edits on top of a style. Every field is optional; null turns a feature off. */
export type CaptionCustom = {
  font?: string; fontTa?: string; size?: number; color?: string; accent?: string;
  outline?: string | null; outlineWidth?: number; box?: string | null; shadow?: boolean;
  case?: "none" | "upper" | "lower"; position?: "top" | "middle" | "bottom"; offset?: number;
  lines?: 1 | 2 | 3;             // lay each caption out on this many lines; unset = wrap by width
  x?: number; y?: number;        // free placement: caption centre as fractions of the frame; overrides position/offset
  safe?: SafeZoneId;             // platform safe zone captions must stay inside
  safeCustom?: Margins;          // margins for safe: "custom"
  bold?: boolean; italic?: boolean;
  spacing?: number; lineHeight?: number; opacity?: number; rotate?: number;
  textAlign?: TextAlign;
  gradient?: [string, string] | null; // top and bottom colours of the text; null: the style's own (solid) colour
  shadowColor?: string; shadowSize?: number; boxPad?: number;
  anim?: Anim; highlight?: Highlight;
  canvas?: Canvas; layers?: TextLayer[]; logo?: Logo; // project only
  show?: "ta" | "en" | "both";   // project only: which lines the subtitles show (ta = the project's language)
};
export type Margins = { top: number; right: number; bottom: number; left: number }; // fractions of the frame

/** The shape of the exported video. */
export const CANVAS_RATIOS = { source: "Original", "9:16": "9:16 · Reels, Shorts, TikTok", "4:5": "4:5 · Feed", "1:1": "1:1 · Square", "16:9": "16:9 · YouTube" } as const;
export type CanvasRatio = keyof typeof CANVAS_RATIOS;
/** fit: the whole video on a background ("blur" = the video itself, blurred, or a #colour); fill: cropped to the shape. */
export type Canvas = { ratio: CanvasRatio; fit: "fit" | "fill"; bg: string };
/** Text (or emoji) over the video for a stretch of time, wherever it was put. */
export type TextLayer = { text: string; start: number; end: number; x: number; y: number; style?: CaptionCustom };
/** An uploaded image over the video: centre (fractions of the frame), width (fraction of the frame width), opacity. */
export type Logo = { ext: "png" | "jpg" | "webp"; x: number; y: number; size: number; opacity: number };

/** Output size for a canvas over a video of w x h. */
export function canvasSize(c: Canvas | undefined, w: number, h: number) {
  const sizes = { "9:16": [1080, 1920], "4:5": [1080, 1350], "1:1": [1080, 1080], "16:9": [1920, 1080] } as const;
  if (!c || c.ratio === "source") return { width: w, height: h };
  const [width, height] = sizes[c.ratio];
  return { width, height };
}
/** `scale`: the user's size, 1 = the standard size every style starts at (see STANDARD). */
export type Placement = { position: "top" | "middle" | "bottom"; offset: number; lines?: 1 | 2 | 3; x?: number; y?: number; safe: Margins; scale: number };

const m = (top: number, right: number, bottom: number, left: number): Margins => ({ top, right, bottom, left });
/** Areas each platform covers with its own buttons and captions on a vertical video (commonly published guides). */
export const SAFE_ZONES = {
  none: { name: "None", m: m(0, 0.07, 0, 0.07) },
  tiktok: { name: "TikTok", m: m(0.1, 0.16, 0.25, 0.04) },
  reels: { name: "Instagram Reels", m: m(0.11, 0.14, 0.22, 0.04) },
  story: { name: "Instagram Story", m: m(0.14, 0.04, 0.2, 0.04) },
  shorts: { name: "YouTube Shorts", m: m(0.1, 0.14, 0.2, 0.04) },
  x: { name: "X / Twitter", m: m(0.05, 0.05, 0.05, 0.05) },
  linkedin: { name: "LinkedIn", m: m(0.05, 0.05, 0.05, 0.05) },
  custom: { name: "Custom", m: m(0.05, 0.05, 0.05, 0.05) },
} as const satisfies Record<string, { name: string; m: Margins }>;
export type SafeZoneId = keyof typeof SAFE_ZONES;

const HEX = /^#[0-9a-fA-F]{6}$/;
const clamp = (n: unknown, lo: number, hi: number) => (typeof n === "number" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : undefined);

/** Keep only well-formed fields (custom styles arrive from the browser). */
export function sanitizeCustom(input: unknown): CaptionCustom {
  const i = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: CaptionCustom = {};
  if (typeof i.font === "string" && (CAPTION_FONTS as readonly string[]).includes(i.font)) out.font = i.font;
  if (typeof i.fontTa === "string" && (TAMIL_FONTS as readonly string[]).includes(i.fontTa)) out.fontTa = i.fontTa;
  const size = clamp(i.size, 0.4, 2.6); if (size !== undefined) out.size = size;
  if (typeof i.color === "string" && HEX.test(i.color)) out.color = i.color;
  if (typeof i.accent === "string" && HEX.test(i.accent)) out.accent = i.accent;
  if (i.outline === null || (typeof i.outline === "string" && HEX.test(i.outline))) out.outline = i.outline as string | null;
  const ow = clamp(i.outlineWidth, 0.01, 0.2); if (ow !== undefined) out.outlineWidth = ow;
  if (i.box === null || (typeof i.box === "string" && HEX.test(i.box))) out.box = i.box as string | null;
  if (typeof i.shadow === "boolean") out.shadow = i.shadow;
  if (i.case === "none" || i.case === "upper" || i.case === "lower") out.case = i.case;
  if (i.position === "top" || i.position === "middle" || i.position === "bottom") out.position = i.position;
  const off = clamp(i.offset, 0.02, 0.45); if (off !== undefined) out.offset = off;
  if (i.lines === 1 || i.lines === 2 || i.lines === 3) out.lines = i.lines;
  const x = clamp(i.x, 0, 1); if (x !== undefined) out.x = x;
  const y = clamp(i.y, 0, 1); if (y !== undefined) out.y = y;
  if (typeof i.bold === "boolean") out.bold = i.bold;
  if (typeof i.italic === "boolean") out.italic = i.italic;
  const sp = clamp(i.spacing, -0.1, 0.5); if (sp !== undefined) out.spacing = sp;
  const lh = clamp(i.lineHeight, 0.7, 2.5); if (lh !== undefined) out.lineHeight = lh;
  if (i.textAlign === "left" || i.textAlign === "center" || i.textAlign === "right") out.textAlign = i.textAlign;
  if (i.gradient === null) out.gradient = null;
  else if (Array.isArray(i.gradient) && i.gradient.length === 2 && i.gradient.every((c) => typeof c === "string" && HEX.test(c))) out.gradient = [i.gradient[0], i.gradient[1]];
  const op = clamp(i.opacity, 0.1, 1); if (op !== undefined) out.opacity = op;
  const rot = clamp(i.rotate, -45, 45); if (rot !== undefined) out.rotate = rot;
  if (typeof i.shadowColor === "string" && HEX.test(i.shadowColor)) out.shadowColor = i.shadowColor;
  const ss = clamp(i.shadowSize, 0, 0.4); if (ss !== undefined) out.shadowSize = ss;
  const bp = clamp(i.boxPad, 0.05, 0.8); if (bp !== undefined) out.boxPad = bp;
  if (typeof i.anim === "string" && i.anim in ANIMS) out.anim = i.anim as Anim;
  if (typeof i.highlight === "string" && i.highlight in HIGHLIGHTS) out.highlight = i.highlight as Highlight;
  if (typeof i.safe === "string" && i.safe in SAFE_ZONES) out.safe = i.safe as SafeZoneId;
  if (i.show === "ta" || i.show === "en" || i.show === "both") out.show = i.show;
  const cv = i.canvas as Record<string, unknown> | undefined;
  if (cv && typeof cv === "object" && typeof cv.ratio === "string" && cv.ratio in CANVAS_RATIOS) {
    out.canvas = { ratio: cv.ratio as CanvasRatio, fit: cv.fit === "fill" ? "fill" : "fit", bg: cv.bg === "blur" || (typeof cv.bg === "string" && HEX.test(cv.bg)) ? cv.bg : "blur" };
  }
  if (Array.isArray(i.layers)) {
    out.layers = i.layers.slice(0, 50).flatMap((l: Record<string, unknown>) => {
      const text = typeof l?.text === "string" ? l.text.slice(0, 200) : "";
      const start = clamp(l?.start, 0, 86400), end = clamp(l?.end, 0, 86400);
      if (!text.trim() || start === undefined || end === undefined || end <= start) return [];
      const style = ownLook(l.style);
      return [{ text, start, end, x: clamp(l.x, 0, 1) ?? 0.5, y: clamp(l.y, 0, 1) ?? 0.5, ...(Object.keys(style).length ? { style } : {}) }];
    });
  }
  const lg = i.logo as Record<string, unknown> | undefined;
  if (lg && typeof lg === "object" && (lg.ext === "png" || lg.ext === "jpg" || lg.ext === "webp")) {
    out.logo = { ext: lg.ext, x: clamp(lg.x, 0, 1) ?? 0.88, y: clamp(lg.y, 0, 1) ?? 0.08, size: clamp(lg.size, 0.03, 0.6) ?? 0.18, opacity: clamp(lg.opacity, 0.1, 1) ?? 1 };
  }
  const sc = i.safeCustom as Record<string, unknown> | undefined;
  if (sc && typeof sc === "object") out.safeCustom = m(clamp(sc.top, 0, 0.4) ?? 0, clamp(sc.right, 0, 0.4) ?? 0, clamp(sc.bottom, 0, 0.4) ?? 0, clamp(sc.left, 0, 0.4) ?? 0);
  return out;
}

/** A caption's or layer's own look: the project-only settings (safe zone, canvas, layers, logo) left out. */
export function ownLook(input: unknown): CaptionCustom {
  const out = sanitizeCustom(input);
  delete out.safe; delete out.safeCustom; delete out.canvas; delete out.layers; delete out.logo; delete out.show;
  delete out.lineHeight; // the whole project's (the MP4 spaces every line of the file the same way)
  return out;
}

/** A style with the user's edits applied, plus where the caption sits on screen. */
export function resolveStyle(id: string | null | undefined, custom: CaptionCustom = {}, portrait = false): CaptionStyle & Placement {
  const s: CaptionStyle = { ...styleOf(id), keyword: styleOf(id).keyword && { ...styleOf(id).keyword } };
  const c = custom;
  const tall0 = looksTall(s.font, s.caps);
  if (c.font) s.font = c.font;
  if (c.fontTa) s.fontTa = c.fontTa;
  if (c.color) {
    s.color = c.color;
    if (typeof s.future === "string") s.future = c.color + "66"; // dimmed version of the new colour
  }
  if (c.accent) {
    if (s.mark) s.mark = c.accent;
    else if (s.keyword) s.keyword.color = c.accent;
    else if (s.active) s.active = c.accent;
    else s.keyword = { color: c.accent };
  }
  if (c.outline === null) s.outline = undefined;
  else if (c.outline || c.outlineWidth !== undefined) s.outline = [c.outline ?? s.outline?.[0] ?? "#000000", c.outlineWidth ?? s.outline?.[1] ?? 0.06];
  if (c.box === null) s.box = undefined;
  else if (c.box) s.box = c.box;
  if (c.shadow === false) s.shadow = 0;
  else if (c.shadow === true && !s.shadow) s.shadow = 0.05;
  if (c.case) { s.caps = c.case === "upper"; s.lower = c.case === "lower"; }
  // Every style starts at the standard size, in any font or case; the user's size is relative to it (1 = 100%).
  s.size = Math.round((s.size ?? 1) * (tall0 / looksTall(s.font, s.caps)) * (c.size ?? 1) * 1000) / 1000;
  if (c.bold !== undefined) s.bold = c.bold;
  if (c.italic !== undefined) s.italic = c.italic;
  if (c.spacing !== undefined) s.spacing = c.spacing;
  if (c.lineHeight !== undefined) s.lineHeight = c.lineHeight;
  if (c.textAlign) s.textAlign = c.textAlign;
  if (c.gradient === null) s.gradient = undefined;
  else if (c.gradient) s.gradient = c.gradient;
  if (c.opacity !== undefined) s.opacity = c.opacity;
  if (c.rotate !== undefined) s.rotate = c.rotate;
  if (c.shadowColor) s.shadowColor = c.shadowColor;
  if (c.shadowSize !== undefined) s.shadow = c.shadowSize;
  if (c.boxPad !== undefined) s.boxPad = c.boxPad;
  if (c.anim) s.anim = c.anim;
  if (c.highlight && c.highlight !== "style") {
    const acc = c.accent ?? s.mark ?? s.keyword?.color ?? s.active ?? HL;
    s.mark = undefined; s.underline = false; s.activeGrow = false; s.active = undefined;
    if (s.keyword) s.keyword = { ...s.keyword, color: undefined, grow: false };
    if (c.highlight === "color") s.active = acc;
    else if (c.highlight === "box") { s.mark = acc; s.active = INK; }
    else if (c.highlight === "underline") { s.underline = true; s.active = c.accent; }
    else if (c.highlight === "grow") { s.activeGrow = true; s.active = acc; }
  }
  if (!highlights(s)) { // one word at a time (Word Cut): nothing to pick out, whatever was set before
    s.mark = undefined; s.active = undefined; s.underline = false; s.activeGrow = false;
    if (s.keyword) s.keyword = { ...s.keyword, color: undefined, grow: false };
  }
  // Captions stay centred on the frame: the platforms cover more of one side (their buttons are on the right), so
  // both sides keep the larger margin rather than centring the caption in the off-centre space left over.
  const zone = c.safe === "custom" && c.safeCustom ? c.safeCustom : SAFE_ZONES[c.safe ?? "none"].m;
  const side = Math.max(zone.left, zone.right);
  const safe: Margins = { ...zone, left: side, right: side };
  const position = c.position ?? "bottom";
  const offset = Math.max(c.offset ?? (portrait ? 0.2 : 0.09), position === "top" ? safe.top : safe.bottom);
  const inside = (v: number | undefined, lo: number, hi: number) => (v === undefined ? undefined : Math.min(hi, Math.max(lo, v)));
  return { ...s, position, offset, lines: c.lines, x: inside(c.x, safe.left, 1 - safe.right), y: inside(c.y, safe.top, 1 - safe.bottom), safe, scale: c.size ?? 1 };
}
/** The project's customisation with one caption's own on top (a caption given a position drops the project's drag point). */
export function mergeCustom(project: CaptionCustom = {}, own?: CaptionCustom): CaptionCustom {
  if (!own) return project;
  const out = { ...project, ...own };
  if (own.position && own.x === undefined) { delete out.x; delete out.y; }
  return out;
}

export const styleOf = (id: string | null | undefined) => CAPTION_STYLES.find((s) => s.id === id) ?? CAPTION_STYLES.find((s) => s.id === DEFAULT_STYLE)!;

/** Words of a line with their timings: the measured starts when there's one per word, else shared by length. */
export function wordTimes(text: string, start: number, end: number, starts?: number[]) {
  const words = text.split(/\s+/).filter(Boolean);
  if (starts && starts.length === words.length && words.length) {
    return words.map((w, i) => ({ w, s: Math.max(start, starts[i]), e: i + 1 < words.length ? Math.max(start, starts[i + 1]) : end }));
  }
  const total = words.reduce((n, w) => n + w.length, 0) || 1;
  let t = start;
  return words.map((w) => {
    const s = t;
    t += ((end - start) * w.length) / total;
    return { w, s, e: t };
  });
}

/** The keyword a style can pick out: the longest word, the later one on a tie. */
export function keywordIndex(words: string[]) {
  let k = 0;
  words.forEach((w, i) => { if (w.length >= words[k].length) k = i; });
  return k;
}
/** A name stands out first (a word with two or more capitals: "EveryCut", "AI"), else the longest word. */
export function nameOrKeyword(words: string[]) {
  const named = words.findIndex((w) => (w.match(/\p{Lu}/gu) ?? []).length >= 2);
  return named >= 0 ? named : keywordIndex(words);
}

/**
 * Cinematic's three lines of n words, as [from, to): an inverted pyramid, about 4 : 3 : 2 words (nine words: four,
 * three, two). The middle line (cineBig) is big, bold and in capitals.
 */
export function cineRows(n: number): [number, number][] {
  if (n <= 2) return n === 2 ? [[0, 1], [1, 2]] : [[0, n]];
  const a = Math.max(1, Math.round((n * 4) / 9)), b = Math.max(1, Math.min(n - a - 1, Math.round((n * 3) / 9)));
  return [[0, a], [a, a + b], [a + b, n]];
}
export const cineBig = (rows: unknown[]) => (rows.length > 1 ? 1 : 0);
/** The big line's size (× the style's), at most: it shrinks to fit the width. */
export const CINE_BIG = 1.45;
/** How much bigger the middle line stays than the others (they shrink with it when it has to fit). */
export const CINE_OVER = 1.25;
/** The big line's font: Poppins ExtraBold with the style's own fonts (Comfortaa or Poppins), else the one picked, bold. */
export const cineFont = (s: CaptionStyle) => (s.font === "Comfortaa Bold" || s.font.startsWith("Poppins") ? "Poppins ExtraBold" : s.font);

/** Split n items into k runs of near-equal size. */
function runs<T>(list: T[], k: number) {
  const out: T[][] = [];
  for (let i = 0, from = 0; i < k; i++) { const to = Math.round((list.length * (i + 1)) / k); out.push(list.slice(from, to)); from = to; }
  return out;
}

/**
 * "stack" styles (and the panel's Trending templates, plugin/subs.js partsChunks): a caption cut into pieces of up
 * to 3 words (2 when English takes the bottom line), each shown as small line / big word / small line, timed by
 * length and at least `minDur` seconds long. `idx` holds the index (in `main`) of each part's words, so a word's
 * own colour can follow it into its piece.
 */
export function stackChunks(main: string, sub: string, start: number, end: number, minDur = 1) {
  const words = main.split(/\s+/).filter(Boolean), en = sub.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const k = Math.max(1, Math.min(Math.ceil(words.length / (en.length ? 2 : 3)), Math.floor((end - start) / minDur)));
  const groups = runs(words, k), ens = runs(en, k);
  const total = groups.reduce((n, g) => n + g.join(" ").length + 1, 0);
  let t = start, at = 0;
  return groups.map((g, i) => {
    const s = t, mid = g.length === 2 ? 1 : Math.floor((g.length - 1) / 2), from = at;
    t += ((end - start) * (g.join(" ").length + 1)) / total;
    at += g.length;
    const span = (a: number, b: number) => Array.from({ length: Math.max(0, b - a) }, (_, k) => from + a + k);
    const parts: [string, string, string] = en.length ? [g.slice(0, -1).join(" "), g[g.length - 1], ens[i].join(" ")]
      : [g.slice(0, mid).join(" "), g[mid], g.slice(mid + 1).join(" ")];
    const idx: [number[], number, number[]] = en.length ? [span(0, g.length - 1), from + g.length - 1, []] : [span(0, mid), from + mid, span(mid + 1, g.length)];
    return { s, e: i === groups.length - 1 ? end : t, parts, idx };
  });
}

/**
 * "hook" styles (the template pack's hooks): a caption cut into pieces of up to 6 words (timed by length, at least
 * `minDur` long), each laid out on up to 4 lines that take the style's sizes and colours in turn. `idx` is each
 * line's words' index in `main`.
 */
export function hookChunks(main: string, start: number, end: number, minDur = 1.2) {
  const words = main.split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const k = Math.max(1, Math.min(Math.ceil(words.length / 6), Math.floor((end - start) / minDur)));
  const groups = runs(words, k);
  const total = groups.reduce((n, g) => n + g.join(" ").length + 1, 0);
  let t = start, at = 0;
  return groups.map((g, i) => {
    const s = t, from = at;
    t += ((end - start) * (g.join(" ").length + 1)) / total;
    at += g.length;
    let w = from;
    const lines = runs(g, Math.min(4, g.length)).map((ws) => { const idx = ws.map((_, n) => w + n); w += ws.length; return { text: ws.join(" "), idx }; });
    return { s, e: i === groups.length - 1 ? end : t, lines };
  });
}
/** A hook line's size (em of the caption font): its style size, smaller when its real width wouldn't fit `widthEm`. */
export const hookFit = (text: string, size: number, widthEm: number, font = "Inter Bold", fontTa?: string) => Math.round(Math.min(size, widthEm / Math.max(0.5, textWidth(text, font, fontTa))) * 100) / 100;
/** Each hook line comes in this long after the one before (seconds). */
export const HOOK_STEP = 0.12;

/** Revealing words (or letters) as they're said: how long each takes to come in, and how far it rises (em). */
export const RISE = 0.27, RISE_DY = 0.25, LETTER_STEP = 0.05;
/** Letters only in plain Latin words: splitting other scripts would break their shaping. */
export const byLetters = (w: string) => /^[\x21-\x7E]+$/.test(w);
/** What comes in, in order: each word, or each letter of the Latin words, with when it starts. */
export function revealUnits(words: { w: string; s: number; e: number }[], letters: boolean) {
  return words.flatMap((w, j) => {
    if (!letters || !byLetters(w.w)) return [{ j, k: null as number | null, s: w.s }];
    const step = Math.min(LETTER_STEP, (w.e - w.s) / Math.max(1, w.w.length));
    return [...w.w].map((_, k) => ({ j, k: k as number | null, s: w.s + k * step }));
  });
}
/** "typo": small and big words in turn (small, big, small, small, big, big, small, small, …), as in the reference. */
const TYPO = [0.55, 1.5, 0.55, 0.55, 1.5, 1.5, 0.55, 0.55];
export const typoSize = (j: number) => TYPO[j % TYPO.length];
/** "typo": a new line after each run of big words (as the reference: "sometimes this / is the best way / to start."). */
export const typoBreak = (j: number, n: number) => j + 1 < n && typoSize(j) > 1 && typoSize(j + 1) < 1;
/**
 * Long captions in layouts made for a few words (Corner Block, Bold Flicker): shown `max` words at a time, each
 * group from its first word to the next group's (the last to the caption's end).
 */
export function wordGroups<T extends { s: number }>(words: T[], max: number, end: number) {
  const k = Math.max(1, Math.ceil(words.length / max)), out: { from: number; to: number; s: number; e: number }[] = [];
  for (let i = 0, from = 0; i < k; i++) {
    const to = Math.round((words.length * (i + 1)) / k);
    out.push({ from, to, s: words[from].s, e: to < words.length ? words[to].s : end });
    from = to;
  }
  return out;
}
/** "corners": words in pairs, the first pinned to the block's left edge, the second to its right. */
export const cornerRows = <T,>(words: T[]) => Array.from({ length: Math.ceil(words.length / 2) }, (_, r) => words.slice(2 * r, 2 * r + 2));

/** Scale of a "stack" style's big word: 1.35× the font, less for a word longer than 10 letters. */
export const stackBig = (word: string) => Math.round(135 * Math.min(1, 10 / Math.max(1, [...word].length))) / 100;

/** Flicker patterns: [ms, visible] steps from the caption's start, then steady. */
export const FLICKER: [number, boolean][] = [[0, false], [50, true], [100, false], [150, true], [210, false], [260, true]];
export const FLICKER2: [number, boolean][] = [[0, false], [40, true], [80, false], [140, true], [180, false], [230, true], [290, false], [330, true], [400, false], [440, true], [520, false], [560, true]];
/** The pattern as ASS tags (each step a 1 ms switch). */
const flickerTags = (steps: [number, boolean][]) => "\\alpha&HFF&" + steps.map(([ms, on]) => `\\t(${ms},${ms + 1},\\alpha&H${on ? "00" : "FF"}&)`).join("");
/** Whether a flicker shows at `ms` into the caption. */
export const flickerOn = (steps: [number, boolean][], ms: number) => { let on = true; for (const [t, v] of steps) if (ms >= t) on = v; return ms < 0 ? false : on; };

/** #RRGGBB[AA] with its opacity multiplied by o. */
export function withOpacity(hex: string, o: number) {
  if (o >= 1) return hex;
  const a = hex.length === 9 ? parseInt(hex.slice(7, 9), 16) / 255 : 1;
  return hex.slice(0, 7) + Math.round(a * o * 255).toString(16).padStart(2, "0");
}

export const caseOf = (s: CaptionStyle, text: string) => (s.caps ? text.toUpperCase() : s.lower ? text.toLowerCase() : text);

/* ---------- ASS (burned-in MP4) ---------- */

/** #RRGGBB[AA] → ASS &HAABBGGRR (ASS alpha is inverted: 00 = opaque). */
export function assColor(hex: string) {
  const h = hex.replace("#", "");
  const a = h.length === 8 ? 255 - parseInt(h.slice(6, 8), 16) : 0;
  const hx = (n: number) => n.toString(16).padStart(2, "0").toUpperCase();
  return `&H${hx(a)}${h.slice(4, 6)}${h.slice(2, 4)}${h.slice(0, 2)}&`.toUpperCase();
}
const alphaOf = (hex: string) => assColor(hex).slice(2, 4);
const colorOnly = (hex: string) => `&H${assColor(hex).slice(4)}`;
const assTime = (t: number) => {
  const cs = Math.max(0, Math.round(t * 100));
  return `${Math.floor(cs / 360000)}:${String(Math.floor(cs / 6000) % 60).padStart(2, "0")}:${String(Math.floor(cs / 100) % 60).padStart(2, "0")}.${String(cs % 100).padStart(2, "0")}`;
};
const esc = (t: string) => t.replace(/[{}]/g, (c) => (c === "{" ? "(" : ")")).replace(/\\/g, "/").replace(/\n/g, "\\N");

const TAMIL_FONT = "Noto Sans Tamil"; // installed on the server (fonts-noto-core)
const EMOJI_FONT = "Noto Emoji"; // one-colour emoji (libass can't draw colour ones); the preview uses it too

/**
 * Put Tamil runs of an ASS event in the Tamil font, then back to the font in effect. Left to libass's own fallback,
 * a style font without Tamil letters picks a font per run, and a word on its own can lose its conjuncts (ப்ப drawn
 * as ப + a dotted circle).
 */
export function tamilRuns(text: string, fonts: Record<string, string>, style: string, tamil = TAMIL_FONT, spacing = 0, ems?: Record<string, number>) {
  type Run = "latin" | "ta" | "emoji";
  let font = fonts[style], out = "", run: Run = "latin", cur = style;
  const fontOf = (r: Run) => (r === "ta" ? tamil : r === "emoji" ? EMOJI_FONT : font);
  // With the styles' em sizes: every font drawn em × its line height (libass sizes by the line, the editor by the em).
  const fsOf = (f: string) => (ems?.[cur] ? `\\fs${Math.round(ems[cur] * lineScale(f) * 10) / 10}` : "");
  for (let i = 0; i < text.length; ) {
    if (text[i] === "{") { // override block: follow \fn and \r[Style]
      const end = text.indexOf("}", i), block = text.slice(i, end + 1);
      let changed = false;
      for (const m of block.matchAll(/\\(fn|r)([^\\}]*)/g)) {
        if (m[1] === "r") cur = fonts[m[2]] ? m[2] : style;
        font = m[1] === "fn" ? m[2] || fonts[style] : fonts[m[2]] ?? fonts[style];
        changed = true;
      }
      out += block; i = end + 1;
      if (run !== "latin") out += `{\\fn${fontOf(run)}${fsOf(fontOf(run))}${spacing ? "\\fsp0" : ""}}`; // a block inside a run may have reset the font
      else if (changed && ems && font !== fonts[cur]) out += `{${fsOf(font)}}`; // a word in another font (a keyword, a big word)
      continue;
    }
    const cp = text.codePointAt(i)!, ch = String.fromCodePoint(cp);
    const kind: Run = /[\u0B80-\u0BFF\u200C\u200D]/.test(ch) ? "ta" : /\p{Extended_Pictographic}/u.test(ch) ? "emoji" : /[\uFE0F\u{1F3FB}-\u{1F3FF}]/u.test(ch) ? run : "latin";
    // Letter spacing pulls Tamil letters apart in libass (ப்ப drawn as ப ் ப): none inside Tamil or emoji.
    if (kind !== run && (kind !== "latin" || !/\s/.test(ch))) { out += `{\\fn${fontOf(kind)}${fsOf(fontOf(kind))}${spacing ? `\\fsp${kind === "latin" ? spacing : 0}` : ""}}`; run = kind; }
    out += ch;
    i += ch.length;
  }
  return out;
}

type Opts = { styleId: string; custom?: CaptionCustom; lang: "ta" | "en" | "both"; width: number; height: number };

/** A full .ass file for the cues in the chosen style, sized to the video. */
export function buildAss(cues: Cue[], o: Opts) {
  const short = Math.min(o.width, o.height);
  // Everything a look needs, for the project's style ("Main") and for each caption that has its own ("C<n>").
  const lookOf = (custom: CaptionCustom | undefined, name: string) => {
    const s = resolveStyle(o.styleId, custom, o.height > o.width);
    // em: the editor's font size (7.5% of the short side × size); the ASS size is em × the font's line height.
    const fs = Math.round(short * 0.075 * (s.size ?? 1) * 10) / 10, assFs = Math.round(fs * lineScale(s.font) * 10) / 10;
    const px = (f = 0) => Math.round(f * fs * 10) / 10;
    const marginV = Math.round(o.height * s.offset);
    // Text alignment: hz -1 / 0 / 1 (left, centre, right) added to an \\an number moves its anchor to that side, and
    // libass lines up an event's lines on it.
    const hz = s.textAlign === "left" ? -1 : s.textAlign === "right" ? 1 : 0;
    const align = s.position === "top" ? 8 : s.position === "middle" ? 5 : 2;
    // Lines wrap inside the safe zone's side margins; dragged, in a column centred on the point (as wide as fits).
    const marginL = Math.round(o.width * s.safe.left), marginR = Math.round(o.width * s.safe.right);
    const marginH = Math.max(marginL, marginR);
    const wrapM = s.x !== undefined ? Math.max(marginH, Math.round(o.width * (0.5 - Math.min(s.x - s.safe.left, 1 - s.safe.right - s.x)))) : 0;
    // Where the caption is anchored: its lines' centre, or with the text aligned to a side, their left or right end
    // (the safe zone's edge; dragged, the column's).
    const ax = s.x !== undefined ? s.x * o.width + hz * (o.width / 2 - wrapM) : hz < 0 ? marginL : hz > 0 ? o.width - marginR : (marginL + o.width - marginR) / 2;
    // Dragged placement: every line on the anchor (dx nudges the VHS colour copies apart).
    const posAt = (dx: number) => (s.x !== undefined && s.y !== undefined ? `{\\an${5 + hz}\\pos(${Math.round(ax + dx)},${Math.round(s.y * o.height)})}` : "");
    const box = !!s.box;
    const fade = (hex: string) => withOpacity(hex, s.opacity ?? 1);
    const shadowColor = s.shadowColor ? s.shadowColor + "99" : "#00000099";
    const line = [
      name, s.font, assFs, assColor(fade(s.color)), assColor(fade(s.color)),
      assColor(fade(box ? s.box! : s.glow && !s.outline ? s.glow + "B0" : s.outline?.[0] ?? "#000000")), assColor(fade(box ? s.box! : shadowColor)),
      s.bold ? -1 : 0, s.italic ? -1 : 0, 0, 0, 100, 100, px(s.spacing), -(s.rotate ?? 0),
      box ? 3 : 1, box ? px(s.boxPad ?? 0.28) : s.glow && !s.outline ? px(0.12) : px(s.outline?.[1]), box ? 0 : px(s.shadow), align + hz, marginL, marginR, marginV, 1,
    ].join(",");
    const ay = s.y !== undefined ? s.y * o.height : align === 8 ? marginV : align === 5 ? o.height / 2 : o.height - marginV;
    /**
     * Entrance for a caption's first event (its later word-by-word events show it settled): tags for the whole event
     * (fade, move) and tags for each word's block (scaling; every word block starts with a reset).
     */
    const entrance = (dur: number): [string, string] => {
      const a = s.anim, t = Math.round(Math.min(250, dur * 400));
      if (!a || a === "none" || a === "wordin") return ["", ""];
      if (a === "blur") return [`{\\fad(${t},0)}`, `\\blur${px(0.5)}\\t(0,${Math.round(t * 1.4)},\\blur0)`];
      if (a === "flicker" || a === "flicker2") return ["", flickerTags(a === "flicker2" ? FLICKER2 : FLICKER)];
      if (a === "ramp") return [`{\\fad(${Math.round(t * 0.5)},0)}`, `\\fscx118\\fscy0\\t(0,${t},0.5,\\fscx100\\fscy100)`];
      if (a === "snap") return [`{\\fad(60,0)}`, `\\fscx150\\fscy150\\t(0,90,\\fscx100\\fscy100)`];
      if (a === "cinematic") return [`{\\fad(300,0)}`, `\\blur${px(0.25)}\\fscx112\\fscy112\\t(0,420,\\blur0\\fscx100\\fscy100)`];
      if (a === "bouncyout") return ["", `\\fscx40\\fscy40\\t(0,${Math.round(t * 0.6)},\\fscx118\\fscy118)\\t(${Math.round(t * 0.6)},${t},\\fscx100\\fscy100)`];
      if (a === "fade") return [`{\\fad(${t},0)}`, ""];
      if (a === "pop") return ["", `\\fscx60\\fscy60\\t(0,${t},\\fscx100\\fscy100)`];
      if (a === "zoom") return ["", `\\fscx0\\fscy0\\t(0,${t},\\fscx100\\fscy100)`];
      if (a === "bounce") return ["", `\\fscx40\\fscy40\\t(0,${Math.round(t * 0.6)},\\fscx118\\fscy118)\\t(${Math.round(t * 0.6)},${t},\\fscx100\\fscy100)`];
      const d = Math.round(fs * 0.6), an = s.x !== undefined ? 5 + hz : align + hz; // slide up
      return [`{\\an${an}\\move(${Math.round(ax)},${Math.round(ay + d)},${Math.round(ax)},${Math.round(ay)},0,${t})\\fad(${Math.round(t * 0.6)},0)}`, ""];
    };
    return { name, s, fs, px, hz, align, posAt, pos: posAt(0), marginL, marginR, wrapM, line, entrance, ax, ay };
  };
  const base = lookOf(o.custom, "Main");
  const looks = [base];
  const lookFor = (c: Cue) => {
    if (!c.style || !Object.keys(c.style).length) return base;
    const l = lookOf(mergeCustom(o.custom, c.style), `C${looks.length}`);
    looks.push(l);
    return l;
  };
  // The English line: 4.1% of the short side in the editor (.cap-sub), in the caption's font (sized as it switches).
  const secondEm = Math.round(short * 0.041 * 10) / 10;
  const second = ["Second", "Poppins", Math.round(secondEm * lineScale("Poppins") * 10) / 10, "&H00FFFFFF&", "&H00FFFFFF&", "&H00000000&", "&H99000000&", 0, 0, 0, 0, 100, 100, 0, 0, 1, base.px(0.04), base.px(0.04), base.align + base.hz, base.marginL, base.marginR, Math.round(o.height * base.s.offset), 1].join(",");

  const events: string[] = [];
  const fonts: Record<string, string> = { Second: "Poppins" }, tamil: Record<string, string> = {}, spaced: Record<string, number> = {};
  const ems: Record<string, number> = { Second: secondEm }; // each style's editor em, so every font switch is sized
  let cur = "Main";
  const add = (start: number, end: number, text: string, layer = 0, ml = 0, mr = 0, st = cur) =>
    end > start && events.push(`Dialogue: ${layer},${assTime(start)},${assTime(end)},${st},,${ml},${mr},0,,${tamilRuns(text, fonts, st, tamil[st], spaced[st], ems)}`);

  for (const c of cues) {
    const main = (o.lang === "en" ? c.en : c.ta).trim();
    if (!main) continue;
    const look = lookFor(c);
    const { s, fs, px, hz, pos, posAt, wrapM, marginL, marginR, entrance, ax, ay, align } = look;
    const glowTag = s.glow ? (s.outline ? `\\3c${colorOnly(s.glow)}\\bord${px(0.1)}\\blur${px(0.12)}` : `\\blur${px(0.12)}`) : ""; // glow: a soft border
    cur = look.name;
    fonts[cur] = s.font;
    ems[cur] = fs;
    if (s.fontTa) tamil[cur] = s.fontTa;
    if (s.spacing) spaced[cur] = px(s.spacing);
    const colors = highlights(s) ? (o.lang === "en" ? c.wce : c.wc) : undefined; // the user's colour for single words
    const sub = o.lang === "both" ? c.en.trim() : "";
    // English in the caption's font, turned and spaced like it.
    const tail = sub ? `\\N{\\rSecond\\fn${s.font}${s.rotate ? `\\frz${-s.rotate}` : ""}${s.spacing ? `\\fsp${px(s.spacing * 0.55)}` : ""}}${esc(breakLines(sub, s.lines))}` : "";
    const words = wordTimes(caseOf(s, main), c.start, c.end, o.lang === "en" ? c.we : c.w);
    // A keyword on a line of its own (Letter Rise) is a name when there is one, as in the reference ("EveryCut").
    const kw = s.keyword?.line ? nameOrKeyword(wordTimes(main, c.start, c.end).map((w) => w.w)) : keywordIndex(words.map((w) => w.w));
    // Line spacing other than the font's own: the lines are broken here and each is placed at its own height
    // (libass has no line spacing; a line is as tall as its font). The editor breaks at the same words (lineCount).
    const grad = s.gradient ?? null;
    const g = spacesLines(s) ? s.lineHeight ?? 1 : 1, ownLines = (Math.abs(g - 1) > 0.005 && spacesLines(s)) || !!grad;
    const ratio = o.width / o.height, room = (o.width - marginL - marginR) * 0.95;
    // A line's natural height, in font f at scale z (Tamil in it: as tall as the Tamil font's line).
    const natOf = (text: string, z = 1, f = s.font) => fs * Math.max(lineScale(f), /[஀-௿]/.test(text) ? lineScale(s.fontTa ?? TAMIL_FONT) : 0) * z;
    const subNatOf = () => (sub ? Math.max(1, Math.ceil((textWidth(c.en, s.font, s.fontTa) * secondEm) / room)) * secondEm * lineScale(s.font) : 0);
    // Lines of these heights one under another (+ the English under them), the block anchored as the font would:
    // their centres, and the English's.
    const stackAt = (nats: number[], withSub = !!sub, gap = 0) => {
      const subNat = withSub ? subNatOf() : 0, h = nats.reduce((a, b) => a + b, 0), total = h + (withSub ? gap : 0) + subNat;
      const top = s.x !== undefined || align === 5 ? ay - total / 2 : align === 8 ? ay : ay - total;
      let y = top;
      return { ys: nats.map((n) => (y += n) - n / 2), subY: top + h + gap + subNat / 2 };
    };
    // The English on its own, centred at y (no gradient).
    const subAt = (start: number, end: number, ev: string, y: number) => { if (tail) add(start, end, at(ev, y)[0] + tail.replace(/^\\N/, ""), 0, marginL, marginR); };
    // Lines placed here, n of them (+ the English under them): their centres g line-heights apart, the line nearest
    // the anchor where the font would put it (a bottom caption's last line, a top caption's first); centred ones
    // grow both ways. A line's natural height (nat) is what a gradient spans.
    const place = (n: number, text: string, scale = 1) => {
      const nat = fs * lineBox(s, text) * scale, box = nat * g;
      const subN = sub ? Math.max(1, Math.ceil((textWidth(c.en, s.font, s.fontTa) * secondEm) / ((o.width - marginL - marginR) * 0.95))) : 0;
      const subLine = secondEm * lineScale(s.font), subNat = subN * subLine, subGap = (box + subLine * g) / 2;
      const span = (n - 1) * box + (sub ? subGap + (subNat - subLine) / 2 : 0); // first centre → last centre
      const first = s.x !== undefined || align === 5 ? ay - span / 2 : align === 8 ? ay + nat / 2 : ay - (sub ? subNat : nat) / 2 - span;
      return { nat, ys: Array.from({ length: n }, (_, k) => first + k * box), subY: first + (n - 1) * box + subGap + (subNat - subLine) / 2 };
    };
    // Tags placing an event's line at y: a slide moves it the same way (and gives the move's start offset and length).
    function at(ev: string, y: number, x = ax): [string, number, number] {
      const m = ev.match(/\\move\(([-\d.]+),([-\d.]+),([-\d.]+),([-\d.]+),(\d+),(\d+)\)/);
      if (!m) return [`{\\an${5 + hz}\\pos(${Math.round(x)},${Math.round(y)})}` + ev, 0, 0];
      const dy = +m[2] - +m[4];
      return [ev.replace(/\\an\d/, `\\an${5 + hz}`).replace(m[0], `\\move(${Math.round(x)},${Math.round(y + dy)},${Math.round(x)},${Math.round(y)},${m[5]},${m[6]})`), dy, +m[6]];
    }
    // Text drawn by `lead` (which places it) with its line centred at y, nat tall: as it is, or with a gradient,
    // GRADIENT_BANDS copies each showing its strip of the line in its colour (libass fills a letter with one colour).
    // Text that moves: where its line is (centre, height) at even steps over the first ms, ending at (y, nat), the
    // strips going along. Words' own colours (the spoken word, picked words) stay.
    const strips = (start: number, end: number, lead: string, y: number, nat: number, body: string, layer = 0, ml = 0, mr = 0, path: [number, number][] = [], ms = 0) => {
      if (!grad) return add(start, end, lead + body, layer, ml, mr);
      for (let k = 0; k < GRADIENT_BANDS; k++) {
        const clip = ([y, nat]: [number, number]) => {
          const y0 = Math.floor(y - nat / 2 + (k * nat) / GRADIENT_BANDS) - (k ? 0 : 200), y1 = Math.ceil(y - nat / 2 + ((k + 1) * nat) / GRADIENT_BANDS) + (k === GRADIENT_BANDS - 1 ? 200 : 0);
          return `\\clip(0,${y0},${o.width},${y1})`;
        };
        const at = (i: number) => Math.round((i * ms) / (path.length - 1));
        const tags = path.length > 1 ? clip(path[0]) + path.slice(1).map((g, i) => `\\t(${at(i)},${at(i + 1)},${clip(g)})`).join("") : clip([y, nat]);
        const tint = `\\1c${colorOnly(mixHex(grad[0], grad[1], inkT((k + 0.5) / GRADIENT_BANDS)))}`;
        add(start, end, lead + `{${tags}${tint}}` + body.replace(/\{\\r/g, `{\\r${tint}`), layer, ml, mr);
      }
    };
    // One line of text centred at (x, y), brought in by the event tags ev (a slide moves it there).
    const line = (start: number, end: number, ev: string, y: number, nat: number, body: string, ml = 0, mr = 0, layer = 0, x = ax) => {
      const [lead, dy, ms] = at(ev, y, x);
      strips(start, end, lead, y, nat, body, layer, ml, mr, dy ? [[y + Math.round(dy), nat], [y, nat]] : [], ms);
    };
    // Lines (each its height and text) one under another, placed here; the English under them.
    const rowsAt = (start: number, end: number, rows: [number, string][], ev = "") => {
      const p = stackAt(rows.map((r) => r[0]));
      rows.forEach(([nat, body], n) => line(start, end, ev, p.ys[n], nat, "{\\q2}" + body));
      subAt(start, end, ev, p.subY);
    };
    // (a word a line and Typo Block break their own way)
    const brk = lineBreaks(words.map((w) => w.w), ownLines && !s.wordLines && s.effect !== "typo" ? lineCount(s, caseOf(s, main), ratio) : s.lines);
    const glue = (j: number) => (j ? (brk.has(j - 1) ? "\\N" : " ") : "");
    const q = s.lines === 1 ? "{\\q2}" : ""; // one line: no auto-wrap

    // One word, in a given state, with its override tags.
    const word = (j: number, i: number, extra = "") => {
      const w = esc(words[j].w);
      const state = j < i ? "past" : j === i ? "active" : "future";
      let t = "\\r" + extra + (s.glow && !s.box ? glowTag : "");
      if (state === "future") {
        if (s.future === null) t += "\\alpha&HFF&";
        else if (s.future) t += `\\1c${colorOnly(s.future)}\\1a&H${alphaOf(s.future)}&`;
      }
      if (state === "active") {
        if (s.active) t += `\\1c${colorOnly(s.active)}`;
        if (s.mark) t += `\\bord${px(0.16)}\\3c${colorOnly(s.mark)}\\shad0`;
        if (s.underline) t += "\\u1";
      }
      if (j === kw && s.keyword && state !== "future") {
        if (s.keyword.color) t += `\\1c${colorOnly(s.keyword.color)}`;
        if (s.keyword.font) t += `\\fn${s.keyword.font}`;
        if (s.keyword.italic) t += "\\i1";
        if (s.keyword.grow) t += state === "active" ? "\\t(0,180,\\fscx118\\fscy118)" : "\\fscx118\\fscy118";
        if (s.keyword.scale) t += `\\fscx${Math.round(s.keyword.scale * 100)}\\fscy${Math.round(s.keyword.scale * 100)}`;
      }
      if (s.anim === "wordin") { // each word blurs in as it's said; the ones to come are hidden
        if (state === "future") t += "\\alpha&HFF&";
        if (state === "active") t += `\\alpha&HFF&\\blur${px(0.3)}\\t(0,160,\\alpha&H00&\\blur0)`;
      }
      if (s.effect === "wobble") t += `\\frz${j % 2 ? -4 : 3}`;
      if (s.activeGrow && state === "active") t += "\\t(0,120,\\fscx115\\fscy115)";
      if (colors?.[j] && state !== "future") t += `\\1c${colorOnly(colors[j]!)}`;
      return `{${t}}${w}`;
    };

    // A word on its own line ("Letter Rise"'s keyword).
    const glueK = (j: number) => (j ? (brk.has(j - 1) || s.wordLines || (s.effect === "typo" && typoBreak(j - 1, words.length)) || (s.keyword?.line && (j === kw || j === kw + 1)) ? "\\N" : " ") : "");
    if (s.effect === "oneword") { // one big word at a time, cut on; a long word shrinks to fit
      words.forEach((wt, i) => { // filling ~87% of the frame's width at most (as the reference), never bigger than the style
        const z = Math.round(Math.min(1, (0.9 * o.width) / (Math.max(0.3, textWidth(wt.w, s.font, s.fontTa)) * fs)) * 100); // advance width; the ink is ~0.85
        const end = i === words.length - 1 ? c.end : words[i + 1].s, w = word(i, i).replace("}", `\\fscx${z}\\fscy${z}}`);
        if (!grad) { add(wt.s, end, pos + w + tail, 0, wrapM, wrapM); return; }
        const p = place(1, wt.w, z / 100); // the word on its own line (so its strips can be cut), the English under it
        line(wt.s, end, "", p.ys[0], p.nat, "{\\q2}" + w);
        if (tail) add(wt.s, end, at("", p.subY)[0] + tail.replace(/^\\N/, ""), 0, marginL, marginR); // the English: no gradient
      });
      continue;
    }
    if (s.effect === "cine") {
      // Three lines, an inverted pyramid (cineRows), the middle one big, bold and in capitals (each line shrunk to fit
      // the width, never wrapped). Each word its own event, settling out of a blur as it's said, in its place.
      const rows = cineRows(words.length), ms = 420, big = cineBig(rows), bigFont = cineFont(s);
      const fontOf = (r: number) => (r === big ? bigFont : s.font);
      const text = (j: number, r: number) => (r === big ? words[j].w.toUpperCase() : words[j].w);
      const fitW = rows.map(([a, b], r) => room / (Math.max(0.3, textWidth(words.slice(a, b).map((_, n) => text(a + n, r)).join(" "), fontOf(r), s.fontTa)) * fs));
      const zBig = Math.min(CINE_BIG, fitW[big]), fit = fitW.map((w, r) => (r === big ? zBig : Math.min(1, w, zBig / CINE_OVER)));
      const nats = rows.map(([a, b], r) => natOf(words.slice(a, b).map((w) => w.w).join(" "), fit[r], fontOf(r)));
      // Line spacing: each line's slot g × its height, and the English g's worth further down (as the editor).
      const gc = s.lineHeight ?? 1, p = stackAt(nats.map((n) => n * gc), !!sub, ((gc - 1) / 2) * fs * lineBox(s, main));
      rows.forEach(([a, b], r) => {
        const z = fit[r], f = fontOf(r), space = textWidth(" ", f, s.fontTa), wid = (j: number) => textWidth(text(j, r), f, s.fontTa) * fs * z;
        const look = r === big ? `\\fn${f}\\b1` : "";
        let x = ax - ((words.slice(a, b).reduce((t, _, n) => t + wid(a + n), 0) + (b - a - 1) * space * fs * z) * (1 + hz)) / 2;
        for (let j = a; j < b; j++) {
          const w = wid(j), cx = x + w / 2, sz = Math.round(z * 100);
          x += w + space * fs * z;
          const tags = `${look}\\fscx${Math.round(sz * 1.12)}\\fscy${Math.round(sz * 1.12)}\\blur${px(0.25)}\\t(0,${ms},\\blur0\\fscx${sz}\\fscy${sz})`;
          const body = word(j, j).replace(/^\{([^}]*)\}.*$/, (_, t) => `{${t}${tags}}${esc(text(j, r))}`);
          strips(words[j].s, c.end, `{\\an5\\pos(${Math.round(cx)},${Math.round(p.ys[r])})\\fad(300,0)}`, p.ys[r], nats[r], "{\\q2}" + body);
        }
      });
      subAt(c.start, c.end, "", p.subY);
      continue;
    }
    if (s.effect === "corners") {
      // Pairs of words pinned to a block's left and right edges (block as wide as its widest pair), each popping on as
      // it's said; the English under the block.
      // Four words (two rows) at a time, as the reference; the English kept inside the frame, under the block.
      const lineH = fs * 1.15, gap = fs * 1.2, wid = (w: string) => textWidth(w, s.font, s.fontTa) * fs;
      const subLines = sub ? Math.max(1, Math.ceil((textWidth(sub, s.font, s.fontTa) * secondEm) / ((o.width - marginL - marginR) * 0.95))) : 0;
      const subH = subLines * secondEm * 1.45;
      for (const g of wordGroups(words, 4, c.end)) {
        const rows = cornerRows(words.slice(g.from, g.to).map((w, n) => ({ ...w, j: g.from + n })));
        const blockW = Math.min(o.width * 0.9, Math.max(...rows.map((r) => wid(r[0].w) + (r[1] ? gap + wid(r[1].w) : 0))));
        const h = rows.length * lineH, bottomPlaced = align === 2 && s.y === undefined;
        const top = align === 8 && s.y === undefined ? ay : bottomPlaced ? ay - subH - h : ay - (h + subH) / 2;
        rows.forEach((r, n) => r.forEach((w, side) => {
          const x = Math.round(ax - (blockW * (1 + hz)) / 2 + (side ? blockW : 0)), y = Math.round(top + n * lineH);
          strips(w.s, g.e, `{\\an${side ? 9 : 7}\\pos(${x},${y})}`, y + natOf(w.w) / 2, natOf(w.w), word(w.j, w.j));
        }));
        if (tail) add(g.s, g.e, `{\\an${8 + hz}\\pos(${Math.round(ax)},${Math.round(top + h + fs * 0.15)})}` + tail.replace(/^\\N/, ""), 0, marginL, marginR);
      }
      continue;
    }
    if (s.reveal || s.effect === "typo") {
      // Each word (or letter) in a layer of its own: the same caption text in every layer (so it lands exactly in
      // place), only that word visible, coming in as it's said; the English stays in one still layer.
      const reveal = s.reveal ?? "rise", letters = reveal === "letters", ms = Math.round(RISE * 1000);
      // typo: its sizes; a word a line: each word shrunk to fit the width when it's long ("PROFESSIONAL")
      const fitLine = (j: number) => Math.min(1, ((o.width - marginL - marginR) * 0.92) / (Math.max(0.3, textWidth(caseOf(s, words[j].w), s.font, s.fontTa)) * fs));
      const zOf = (j: number) => (s.effect === "typo" ? typoSize(j) : s.wordLines ? fitLine(j) : 1);
      const sized = (j: number) => {
        const z = zOf(j);
        return z === 1 ? "" : `\\fscx${Math.round(z * 100)}\\fscy${Math.round(z * 100)}`;
      };
      // A word a line (Bold Flicker): three words at a time, so a long caption doesn't run off the frame.
      const groups = s.wordLines ? wordGroups(words, 3, c.end) : [{ from: 0, to: words.length, s: c.start, e: c.end }];
      const body = (on: (j: number, k: number | null) => boolean, tags: string, g = groups[0], from = g.from, to = g.to) => words.slice(from, to).map((w, n) => {
        const j = from + n;
        const base = word(j, j).match(/^\{([^}]*)\}/)![1] + sized(j); // the word's look, settled
        const part = (txt: string, k: number | null) => `{${base}${on(j, k) ? tags : "\\alpha&HFF&"}}${esc(txt)}`;
        return (n ? glueK(j) : "") + (letters && byLetters(w.w) ? [...w.w].map((ch, k) => part(ch, k)).join("") : part(w.w, null));
      }).join("");
      const hiddenTail = tail.replace("}", "\\alpha&HFF&}");
      const an = s.x !== undefined ? 5 + hz : align + hz, dy = Math.round(px(RISE_DY));
      const rise = (t0: string) => `{\\an${an}\\move(${Math.round(ax)},${Math.round(ay + dy)},${Math.round(ax)},${Math.round(ay)},0,${ms})}` + t0;
      const tagsFor = reveal === "flicker" ? flickerTags(FLICKER2) : `\\alpha&HFF&\\t(0,${ms},\\alpha&H00&)`;
      for (const g of groups) {
        if (grad) { // each line its own event (so its strips can be cut), a word's layer only its line
          const rows: [number, number][] = [];
          for (let j = g.from; j < g.to; j++) if (j === g.from || glueK(j) === "\\N") rows.push([j, j + 1]); else rows[rows.length - 1][1] = j + 1;
          const k = s.keyword, natW = (j: number) => natOf(words[j].w, zOf(j) * (j === kw && k?.scale ? k.scale : 1), (j === kw && k?.font) || s.font);
          const nats = rows.map(([a, b]) => Math.max(...words.slice(a, b).map((_, n) => natW(a + n))));
          const p = stackAt(nats);
          for (const u of revealUnits(words.slice(g.from, g.to), letters)) {
            // the strips span this word (a smaller word sits on the line's baseline, ~80% down a line)
            const j = g.from + u.j, r = rows.findIndex(([a, b]) => j >= a && j < b), n = natW(j), cy = p.ys[r] + 0.3 * (nats[r] - n);
            const [lead, dy, ms2] = at(reveal === "flicker" ? "" : rise(""), p.ys[r]);
            strips(Math.max(g.s, u.s), g.e, lead, cy, n, "{\\q2}" + body((jj, kk) => jj === j && (u.k === null || kk === u.k), tagsFor, g, ...rows[r]), 1, 0, 0, dy ? [[cy + dy, n], [cy, n]] : [], ms2);
          }
          subAt(g.s, g.e, "", p.subY);
          continue;
        }
        for (const u of revealUnits(words.slice(g.from, g.to), letters))
          add(Math.max(g.s, u.s), g.e, (reveal === "flicker" ? pos : rise("")) + q + body((j, k) => j === g.from + u.j && (u.k === null || k === u.k), tagsFor, g) + hiddenTail, 1, wrapM, wrapM);
        if (tail) add(g.s, g.e, pos + body(() => false, "", g) + tail, 0, wrapM, wrapM);
      }
      continue;
    }
    if (s.effect === "stack" && s.stack) {
      const small = "\\fscx60\\fscy60";
      // A small line word by word, so a word the user coloured keeps its colour (then back to the line's own).
      const smallLine = (text: string, idx: number[]) => text.split(" ").map((w, k) => colors?.[idx[k]] ? `{\\1c${colorOnly(colors[idx[k]]!)}}${esc(w)}{\\r${small}}` : esc(w)).join(" ");
      for (const p of stackChunks(caseOf(s, main), sub, c.start, c.end)) {
        const a = smallLine(p.parts[0], p.idx[0]), b = esc(p.parts[1]), d = p.idx[2].length ? smallLine(p.parts[2], p.idx[2]) : esc(p.parts[2]);
        const z = stackBig(p.parts[1]); // a long word gets smaller instead of running off the frame
        const bigCol = colors?.[p.idx[1]] ?? s.stack.big;
        const glowBig = s.stack.glow ? `\\3c${colorOnly(bigCol)}\\3a&H60&\\bord${px(0.07)}\\blur${px(0.22)}` : "";
        const grow = `\\fscx${Math.round(z * 40)}\\fscy${Math.round(z * 40)}\\t(0,220,\\fscx${Math.round(z * 100)}\\fscy${Math.round(z * 100)})`;
        // with a gradient the big word takes it too (unless the user coloured it)
        const big = `{\\r\\fn${s.stack.font}\\b0${grad && !colors?.[p.idx[1]] ? "" : `\\1c${colorOnly(bigCol)}`}${glowBig}${grow}}${b}`;
        if (grad) { // the lines placed one by one (so their strips can be cut); the red and cyan copies only the big word
          const parts = [a && [natOf(p.parts[0], 0.6), `{${small}}${a}`], [natOf(p.parts[1], z, s.stack.font), big], d && [natOf(p.parts[2], 0.6), `{${small}}${d}`]].filter(Boolean) as [number, string][];
          const at2 = stackAt(parts.map((x) => x[0]), false), bigAt = a ? 1 : 0;
          if (s.stack.rgb) {
            const dx = Math.max(2, Math.round(px(0.05)));
            for (const [col, x] of [["#FF2040", ax + dx], ["#00E5FF", ax - dx]] as const)
              add(p.s, p.e, at("{\\fad(120,0)}", at2.ys[bigAt], x)[0] + `{\\q2}{\\r\\fn${s.stack.font}\\b0\\1c${colorOnly(col)}\\1a&H50&\\bord0\\shad0${grow}}${b}`);
          }
          parts.forEach(([nat, txt], n) => line(p.s, p.e, "{\\fad(120,0)}", at2.ys[n], nat, "{\\q2}" + txt, 0, 0, 1));
          continue;
        }
        const layout = (bigPart: string, smallAlpha = "") => pos + `{\\q2\\fad(120,0)}` + (a ? `{${small}${smallAlpha}}${a}\\N` : "") + bigPart + (d ? `\\N{\\r${small}${smallAlpha}}${d}` : "");
        if (s.stack.rgb) { // the big word again in red and cyan, nudged apart behind it (the small lines invisible)
          const dx = Math.max(2, Math.round(px(0.05)));
          // nudged by margins (an event margin of 0 means the style's, so start from the real ones)
          const L = wrapM || marginL, R = wrapM || marginR;
          for (const [col, ml, mr] of [["#FF2040", L + 2 * dx, R], ["#00E5FF", L, R + 2 * dx]] as const)
            add(p.s, p.e, layout(`{\\r\\fn${s.stack.font}\\b0\\1c${colorOnly(col)}\\1a&H50&\\bord0\\shad0${grow}}${b}`, "\\alpha&HFF&"), 0, ml, mr);
        }
        add(p.s, p.e, layout(big), 1, wrapM || marginL, wrapM || marginR);
      }
      continue;
    }
    if (s.effect === "hook" && s.hook) {
      const h = s.hook, widthEm = (o.width - marginL - marginR) * 0.86 / fs;
      for (const p of hookChunks(caseOf(s, main), c.start, c.end)) {
        const text = p.lines.map((ln, j) => {
          const col = h.colors[j % h.colors.length], f = h.fonts?.[j % h.colors.length];
          const z = hookFit(ln.text, h.sizes[j % h.sizes.length], widthEm, f ?? s.font, s.fontTa), at = Math.round(j * HOOK_STEP * 1000);
          const head = `\\r\\fscx${Math.round(z * 100)}\\fscy${Math.round(z * 100)}${grad ? "" : `\\1c${colorOnly(col)}`}${f ? `\\fn${f}` : ""}`;
          const reveal = `\\alpha&HFF&\\blur${px(0.15)}\\t(${at},${at + 180},\\alpha&H00&\\blur0)`;
          // a word the user coloured keeps its colour
          return [natOf(ln.text, z, f ?? s.font), ln.text.split(" ").map((w, n) => `{${head}${colors?.[ln.idx[n]] ? `\\1c${colorOnly(colors[ln.idx[n]]!)}` : ""}${reveal}}${esc(w)}`).join(" ")] as const;
        });
        if (grad) { // each line placed here (so its strips can be cut), the English under them
          const at2 = stackAt(text.map((t) => t[0]));
          text.forEach(([nat, t], j) => line(p.s, p.e, "", at2.ys[j], nat, "{\\q2}" + t));
          subAt(p.s, p.e, "", at2.subY);
          continue;
        }
        add(p.s, p.e, pos + text.map((t) => t[1]).join("\\N") + tail, 0, wrapM, wrapM); // lines fitted already; the English below wraps
      }
      continue;
    }
    if (s.effect === "crawl") {
      // As the editor: the block tipped back 50° about its own bottom edge and sliding up that slope (28% of the
      // short side), so it rolls off into the distance. libass draws y (above the pivot) at tip(y).
      const rows = breakLines(caseOf(s, main), lineCount(s, caseOf(s, main), ratio)).split("\n"), nats = rows.map((r) => natOf(r));
      const p = stackAt(nats), bottom = sub ? p.subY + subNatOf() / 2 : p.ys[rows.length - 1] + nats[rows.length - 1] / 2;
      const rise = short * 0.28, ms = Math.round((c.end - c.start) * 1000), cos = Math.cos((50 * Math.PI) / 180), sin = Math.sin((50 * Math.PI) / 180);
      const tip = (y: number) => bottom - (bottom - y) * cos * (CRAWL_DIST / (CRAWL_DIST + (bottom - y) * sin));
      const lead = (y: number) => `{\\an${5 + hz}\\fad(200,300)\\org(${Math.round(ax)},${Math.round(bottom)})\\frx50\\move(${Math.round(ax)},${Math.round(y)},${Math.round(ax)},${Math.round(y - rise)})}`;
      rows.forEach((r, k) => { // a line at a time; with a gradient its strips where the tipped line is drawn, as it goes
        const y = p.ys[k], n = nats[k], path = Array.from({ length: CRAWL_STEPS + 1 }, (_, i): [number, number] => {
          const a = tip(y - (rise * i) / CRAWL_STEPS - n / 2), b = tip(y - (rise * i) / CRAWL_STEPS + n / 2);
          return [(a + b) / 2, b - a];
        });
        strips(c.start, c.end, lead(y), ...path[CRAWL_STEPS], `{\\q2}${esc(r)}`, 0, 0, 0, path, ms);
      });
      if (tail) add(c.start, c.end, lead(p.subY) + tail.replace(/^\\N/, ""), 0, marginL, marginR);
      continue;
    }
    if (s.effect === "vhs") {
      // (with a gradient broken here, as the white copy is)
      const rows = breakLines(caseOf(s, main), grad ? lineCount(s, caseOf(s, main), ratio) : s.lines);
      const text = esc(rows) + tail;
      const nudge = [0, 2, -1, 1, -2];
      for (let t = c.start, k = 0; t < c.end; t += 0.25, k++) {
        const e = Math.min(c.end, t + 0.25), d = Math.round(px(0.05) + nudge[k % nudge.length]);
        add(t, e, posAt(d + 2) + `{\\1c&H3C3CFF&\\1a&H60&\\bord0\\shad0}${text}`, 0, marginL + 2 * d + 4, marginR); // red, nudged right
        add(t, e, posAt(-d - 2) + `{\\1c&HFFE600&\\1a&H60&\\bord0\\shad0}${text}`, 1, marginL, marginR + 2 * d + 4); // cyan, nudged left
        if (!grad) add(t, e, pos + `{\\bord0\\shad0}${text}`, 2);
      }
      if (grad) { // the white copy still: once, a line at a time (so its strips can be cut)
        const at2 = stackAt(rows.split("\n").map((r) => natOf(r)));
        rows.split("\n").forEach((r, n) => line(c.start, c.end, "", at2.ys[n], natOf(r), `{\\q2\\bord0\\shad0}${esc(r)}`, 0, 0, 2));
        if (tail) add(c.start, c.end, at("", at2.subY)[0] + `{\\bord0\\shad0}` + tail.replace(/^\\N/, ""), 2, marginL, marginR);
      }
      continue;
    }
    if (s.effect === "typewriter") {
      const chars = [...breakLines(caseOf(s, main), grad ? lineCount(s, caseOf(s, main), ratio) : s.lines)];
      const step = (c.end - c.start) * 0.8 / chars.length;
      if (grad) { // the lines typed so far, each placed here (so its strips can be cut); a finished line one event
        const glow = glowTag ? `{${glowTag}}` : "";
        for (let n = 1; n <= chars.length; ) {
          const shown = chars.slice(0, n).join("").split("\n"), m = shown.length, at2 = stackAt(chars.join("").split("\n").slice(0, m).map((r) => natOf(r)));
          let e = n; // the last step with these m lines
          while (e < chars.length && chars[e] !== "\n") e++;
          const t0 = c.start + (n - 1) * step, t1 = e === chars.length ? c.end : c.start + e * step;
          chars.join("").split("\n").slice(0, m - 1).forEach((r, k) => line(t0, t1, "", at2.ys[k], natOf(r), "{\\q2}" + glow + esc(r)));
          for (let q2 = n; q2 <= e; q2++) {
            const a = c.start + (q2 - 1) * step, b = q2 === chars.length ? c.end : a + step, cur = chars.slice(0, q2).join("").split("\n")[m - 1];
            line(a, b, "", at2.ys[m - 1], natOf(chars.join("").split("\n")[m - 1]), "{\\q2}" + glow + `${esc(cur)}{\\alpha&H00&}_`);
          }
          subAt(t0, t1, "", at2.subY);
          n = e + 1;
        }
        continue;
      }
      for (let n = 1; n <= chars.length; n++) {
        const t0 = c.start + (n - 1) * step;
        const t1 = n === chars.length ? c.end : t0 + step;
        add(t0, t1, pos + (glowTag ? `{${glowTag}}` : "") + `${esc(chars.slice(0, n).join(""))}{\\alpha&H00&}_${tail}`, 0, wrapM, wrapM);
      }
      continue;
    }
    words.forEach((wt, i) => {
      const end = i === words.length - 1 ? c.end : words[i + 1].s;
      let text: string;
      if (s.effect === "solo" && grad) {
        rowsAt(wt.s, end, [...(i > 0 ? [[natOf(words[i - 1].w, 0.45), `{\\fscx45\\fscy45\\1a&H60&}${esc(words[i - 1].w)}`] as [number, string]] : []), [natOf(wt.w), `{\\r\\t(0,120,\\fscx108\\fscy108)}${esc(wt.w)}`]]);
        return;
      } else if (s.effect === "punch" && words.length > 2 && grad) {
        // the set-up small and the punch big, each broken into lines that fit
        const cut = words.length - Math.min(2, words.length - 1);
        const rowsOf = (a: number, b: number, z: number) => {
          const ws = words.slice(a, b).map((w) => w.w), br = lineBreaks(ws, Math.max(1, Math.ceil((textWidth(ws.join(" "), s.font, s.fontTa) * fs * z) / room)));
          const out: [number, string][] = [];
          for (let j = a, from = a; j < b; j++) if (br.has(j - a) || j === b - 1) {
            out.push([natOf(ws.slice(from - a, j + 1 - a).join(" "), z), words.slice(from, j + 1).map((_, k) => word(from + k, i)).join(" ").replace(/\{\\r/g, `{\\r\\fscx${Math.round(z * 100)}\\fscy${Math.round(z * 100)}`)]);
            from = j + 1;
          }
          return out;
        };
        rowsAt(wt.s, end, [...rowsOf(0, cut, 0.55), ...rowsOf(cut, words.length, 1.4)]);
        return;
      } else if (s.effect === "solo") {
        text = (i > 0 ? `{\\fscx45\\fscy45\\1a&H60&}${esc(words[i - 1].w)}\\N` : "") + `{\\r\\t(0,120,\\fscx108\\fscy108)}${esc(wt.w)}`;
      } else if (s.effect === "punch" && words.length > 2) {
        const cut = words.length - Math.min(2, words.length - 1);
        const setup = words.slice(0, cut).map((_, j) => word(j, i)).join(" ");
        const punch = words.slice(cut).map((_, k) => word(cut + k, i)).join(" ");
        text = `{\\fscx55\\fscy55}${setup.replace(/\{\\r/g, "{\\r\\fscx55\\fscy55")}\\N{\\r\\fscx140\\fscy140}${punch.replace(/\{\\r/g, "{\\r\\fscx140\\fscy140")}`;
      } else {
        // The first event brings the caption in (a slide places it itself).
        const [ev0, each] = i === 0 ? entrance(c.end - c.start) : ["", ""];
        // "Bounce, fade out": the caption's last event fades away.
        const ev = i === words.length - 1 && s.anim === "bouncyout" ? ev0 + "{\\fad(0,250)}" : ev0;
        text = words.map((_, j) => glue(j) + word(j, i, each)).join("");
        const sub = each && tail ? tail.replace("}", each + "}") : tail;
        if (ownLines) { // each line at its own height, centred on the caption's anchor; the English under them
          const starts = [0, ...[...brk].sort((a, b) => a - b).map((b) => b + 1)], n = starts.length, p = place(n, main);
          starts.forEach((a, k) => {
            const b = k + 1 < n ? starts[k + 1] : words.length;
            line(wt.s, end, ev, p.ys[k], p.nat, "{\\q2}" + words.slice(a, b).map((_, m) => (m ? " " : "") + word(a + m, i, each)).join(""));
          });
          if (sub) { const [lead] = at(ev, p.subY); add(wt.s, end, lead + sub.replace(/^\\N/, ""), 0, marginL, marginR); }
          return;
        }
        add(wt.s, end, (ev.includes("\\move") ? "" : pos) + ev + q + text + sub, 0, wrapM, wrapM);
        return;
      }
      add(wt.s, end, pos + q + text + tail, 0, wrapM, wrapM);
    });
  }

  // Text layers: plain text placed where it was put, in the project look with its own changes on top.
  (o.custom?.layers ?? []).forEach((l, n) => {
    const look = lookOf(mergeCustom(o.custom, { ...l.style, x: l.x, y: l.y }), `L${n + 1}`);
    looks.push(look);
    cur = look.name;
    fonts[cur] = look.s.font;
    ems[cur] = look.fs;
    if (look.s.fontTa) tamil[cur] = look.s.fontTa;
    if (look.s.spacing) spaced[cur] = look.px(look.s.spacing);
    const [ev, each] = look.entrance(l.end - l.start);
    const glow = look.s.glow && !look.s.box ? `\\blur${look.px(0.12)}` : "";
    add(l.start, l.end, (ev.includes("\\move") ? "" : look.pos) + ev + `{\\r${each}${glow}}` + esc(caseOf(look.s, l.text)), 5, look.wrapM, look.wrapM);
  });

  return `[Script Info]
ScriptType: v4.00+
PlayResX: ${o.width}
PlayResY: ${o.height}
WrapStyle: 1
ScaledBorderAndShadow: yes

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
${looks.map((l) => `Style: ${l.line}`).join("\n")}
Style: ${second}

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
${events.join("\n")}
`;
}

/**
 * Line spacing (lineHeight) applies to the plain layout, where captions are lines of words; styles that lay out their
 * own lines (hooks, stacks, one word, corners, reveals…) keep their design.
 */
export const spacesLines = (s: CaptionStyle) => !((s.effect && s.effect !== "wobble") || s.reveal || s.wordLines || s.keyword?.line);
/** Styles the line spacing reaches: the plain layout's, and Cinematic's three lines. */
export const takesLineSpacing = (s: CaptionStyle) => spacesLines(s) || s.effect === "cine";

/** How tall a line of this text is, × the em: its fonts' own line height (what libass draws, so the editor matches). */
export const lineBox = (s: CaptionStyle, text: string) =>
  Math.max(lineScale(s.font), /[\u0B80-\u0BFF]/.test(text) ? lineScale(s.fontTa ?? TAMIL_FONT) : 0);

/**
 * How many lines a caption takes in a frame of this shape (width ÷ height): its set line count, else as many as its
 * width needs between the side margins. The editor and the MP4 break at the same words with it.
 */
export function lineCount(s: CaptionStyle & Placement, text: string, ratio: number) {
  if (s.lines) return s.lines;
  const w = Math.max(ratio, 1), em = 0.075 * (s.size ?? 1); // in short sides: the frame is w wide, the em 7.5% of it
  const room = s.x !== undefined ? 2 * Math.min(s.x - s.safe.left, 1 - s.safe.right - s.x) : 1 - s.safe.left - s.safe.right;
  return Math.max(1, Math.ceil((textWidth(text, s.font, s.fontTa) * em) / (w * room * 0.95) - 1e-6));
}

/** Whether a style picks out the spoken word (its colour, box, underline, grow, words coloured by hand): not Word Cut,
    which shows one word at a time. Its look controls and the Highlight button go with it. */
export const highlights = (s: CaptionStyle) => s.effect !== "oneword";

/** libass's camera distance for 3D turns (\\frx): 20000 in 1/64 pixels (where Crawl's tipped lines are drawn). */
const CRAWL_DIST = 20000 / 64;
/** Steps a Crawl line's strips follow it in (its tipped path isn't straight). */
const CRAWL_STEPS = 8;

/** How many strips draw a gradient in the MP4: smooth to the eye at caption sizes. */
const GRADIENT_BANDS = 10;

/** The colour a fraction t of the way from a to b (#rrggbb). */
export function mixHex(a: string, b: string, t: number) {
  const p = (h: string, i: number) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return "#" + [0, 1, 2].map((i) => Math.round(p(a, i) + (p(b, i) - p(a, i)) * t).toString(16).padStart(2, "0")).join("");
}

/** Where the letters are in a line's height (the rest is the font's room above and below): the gradient runs across
    them, top colour above, bottom colour below. The editor's CSS gradient uses the same stops. */
export const GRADIENT_STOPS = [0.22, 0.78] as const;
const inkT = (y: number) => Math.min(1, Math.max(0, (y - GRADIENT_STOPS[0]) / (GRADIENT_STOPS[1] - GRADIENT_STOPS[0])));
