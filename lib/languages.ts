/**
 * Subtitle languages: every Indian language Sarvam's speech-to-text and translation support.
 * A project's subtitles are always "<language> + English"; English speech is translated into <language>.
 * Codes are Sarvam's BCP-47 codes. Cue field `ta` holds the <language> line (the name predates multi-language).
 */
export const LANGUAGES = [
  { code: "ta-IN", name: "Tamil", native: "தமிழ்" },
  { code: "hi-IN", name: "Hindi", native: "हिन्दी" },
  { code: "te-IN", name: "Telugu", native: "తెలుగు" },
  { code: "ml-IN", name: "Malayalam", native: "മലയാളം" },
  { code: "kn-IN", name: "Kannada", native: "ಕನ್ನಡ" },
  { code: "bn-IN", name: "Bengali", native: "বাংলা" },
  { code: "mr-IN", name: "Marathi", native: "मराठी" },
  { code: "gu-IN", name: "Gujarati", native: "ગુજરાતી" },
  { code: "pa-IN", name: "Punjabi", native: "ਪੰਜਾਬੀ" },
  { code: "od-IN", name: "Odia", native: "ଓଡ଼ିଆ" },
  { code: "ur-IN", name: "Urdu", native: "اردو" },
  { code: "as-IN", name: "Assamese", native: "অসমীয়া" },
  { code: "ne-IN", name: "Nepali", native: "नेपाली" },
  { code: "kok-IN", name: "Konkani", native: "कोंकणी" },
  { code: "mai-IN", name: "Maithili", native: "मैथिली" },
  { code: "sa-IN", name: "Sanskrit", native: "संस्कृतम्" },
  { code: "ks-IN", name: "Kashmiri", native: "كٲشُر" },
  { code: "sd-IN", name: "Sindhi", native: "سنڌي" },
  { code: "doi-IN", name: "Dogri", native: "डोगरी" },
  { code: "brx-IN", name: "Bodo", native: "बड़ो" },
  { code: "mni-IN", name: "Manipuri", native: "মৈতৈলোন্" },
  { code: "sat-IN", name: "Santali", native: "ᱥᱟᱱᱛᱟᱲᱤ" },
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]["code"];
export const DEFAULT_LANGUAGE: LanguageCode = "ta-IN";

export const isLanguage = (code: unknown): code is LanguageCode => LANGUAGES.some((l) => l.code === code);
export const languageOf = (code: string | null | undefined) => LANGUAGES.find((l) => l.code === code) ?? LANGUAGES[0];
/** "ta" from "ta-IN", for lang attributes and file names. */
export const shortCode = (code: string | null | undefined) => languageOf(code).code.split("-")[0];
