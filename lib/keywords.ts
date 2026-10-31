/**
 * Picking the words worth highlighting in a caption, the way editors do by hand: numbers and money first, then names,
 * then strong words, then long content words; never filler. No AI call: instant, free and the same every time.
 */
const STOP = new Set(("a an the and or but so if of to in on at by for from with as is are was were be been being it its this that these those " +
  "i me my we our you your he him his she her they them their there here what which who whom when where how why not no do does did done " +
  "have has had just very really also then than too can could will would should may might shall am im i'm it's that's dont don't " +
  "um uh ah oh okay ok yeah yes like get got go going gonna wanna about into over up out down all any some more most much many one").split(" "));
// Tanglish fillers and particles (said, not meant)
const FILLER = new Set("na la da di pa ma ah ahh oh ok seri sari enna appo apdi inga anga thaan dhaan nu ngra".split(" "));
const STRONG = new Set(("never always best worst free secret only must stop start now new first last biggest top huge mistake money profit " +
  "save lose win growth fast easy hard truth real why how instantly guaranteed exclusive viral simple important").split(" "));

const bare = (w: string) => w.replace(/^[^\p{L}\p{N}₹$]+|[^\p{L}\p{N}%]+$/gu, "");

/** How much a word stands out (higher first); -Infinity for words never worth it. */
export function wordScore(word: string, i: number) {
  const w = bare(word), lw = w.toLowerCase();
  if (!w || STOP.has(lw) || FILLER.has(lw)) return -Infinity;
  let s = Math.min(w.length, 12) / 3; // longer content words carry more
  if (/[\d₹$%]/.test(w)) s += 6; // 70%, ₹500, 2026
  if (/\p{Lu}.*\p{Lu}/u.test(w)) s += 3; // AI, EveryCut
  else if (i > 0 && /^\p{Lu}/u.test(w)) s += 2; // a name mid-sentence
  if (STRONG.has(lw)) s += 3;
  if (/[!?]$/.test(word)) s += 1;
  return s;
}

/** The indexes of the words to highlight in a caption: one, or two in a long one (never side by side). */
export function pickKeywords(words: string[]) {
  const max = words.length > 8 ? 2 : 1;
  const ranked = words.map((w, i) => [wordScore(w, i), i] as const).filter(([s]) => s > 1.5).sort((a, b) => b[0] - a[0]);
  const out: number[] = [];
  for (const [, i] of ranked) {
    if (out.length >= max) break;
    if (out.some((j) => Math.abs(j - i) < 2)) continue;
    out.push(i);
  }
  return out.sort((a, b) => a - b);
}
