/**
 * The clip in the home page's "Why Vasanamm" cards (public/home/vs-clip.mp4, muted), used with permission.
 * `good` and `en` are Vasanamm's own subtitles for it, as made by the site; `bad` is the same line the way usual
 * auto-captions write it (English words forced into Tamil letters, in [brackets] to underline them).
 */
export type ClipCue = { start: number; end: number; good: string; en: string; bad: string };

export const CLIP: { src: string; poster: string; cues: ClipCue[] } = {
  src: "/home/vs-clip.mp4",
  poster: "/home/vs-clip.webp",
  // Made by Vasanamm (Sarvam saaras:v4, Tamil, spoken + English) on 10 Nov 2026, unedited.
  cues: [
    { start: 0.00, end: 2.35, good: "அந்த final கூட கொடுக்காம அந்த வெத்தலை", en: "They would give only that betel leaf", bad: "அந்த [ஃபைனல்] கூட கொடுக்காம அந்த வெத்தலை" },
    { start: 2.35, end: 3.11, good: "பாக்கு மட்டும் கொடுப்பாங்க.", en: "without even giving the final.", bad: "பாக்கு மட்டும் கொடுப்பாங்க." },
    { start: 3.11, end: 4.55, good: "இப்ப producersலாம் வெத்தலை பாக்குலாம்", en: "Now producers are giving", bad: "இப்ப [ப்ரொடியூசர்ஸ்]லாம் வெத்தலை பாக்குலாம்" },
    { start: 4.55, end: 7.07, good: "கொடுக்குறாங்க.", en: "betel leaf.", bad: "கொடுக்குறாங்க." },
    { start: 7.02, end: 9.68, good: "First குடுத்திருந்தாங்க இப்போ.", en: "They had given it first, now.", bad: "[ஃபர்ஸ்ட்] குடுத்திருந்தாங்க இப்போ." },
    { start: 9.68, end: 11.30, good: "Sometimes even on இந்த audio launch-ல when", en: "Sometimes even on this audio launch,", bad: "[சம்டைம்ஸ்] [ஈவன்] [ஆன்] இந்த [ஆடியோ] [லான்ச்]ல [வென்]" },
    { start: 11.30, end: 12.86, good: "they say Ani படம் பாத்து நல்லா இருக்குன்னு", en: "when they say Ani watched the movie and said it's good,", bad: "[தே] [சே] [அனி] படம் பாத்து நல்லா இருக்குன்னு" },
    { start: 12.86, end: 14.36, good: "சொன்னாருன்னா அப்படி ஒரு இது இருக்குல்ல.", en: "there's that kind of thing, right?", bad: "சொன்னாருன்னா அப்படி ஒரு இது இருக்குல்ல." },
    { start: 14.36, end: 16.34, good: "Plus நீங்க வேற emoji-ல வேற போடுறீங்கல்ல.", en: "Plus, you're putting emojis and all, right?", bad: "[ப்ளஸ்] நீங்க வேற [எமோஜி]ல வேற போடுறீங்கல்ல." },
    { start: 16.34, end: 18.70, good: "அதான் stop பண்ணிட்டேன் நான் இப்போ.", en: "Ah, that's why I stopped it now.", bad: "அதான் [ஸ்டாப்] பண்ணிட்டேன் நான் இப்போ." },
    { start: 18.70, end: 20.40, good: "I stopped it ஏன்னா அது நமக்கு ஒரு pressure", en: "I stopped it because it becomes a pressure", bad: "[ஐ] [ஸ்டாப்டு] [இட்] ஏன்னா அது நமக்கு ஒரு [பிரஷர்]" },
    { start: 20.40, end: 21.28, good: "ஆயிடுது அதுக்கப்புறம்.", en: "for us after that.", bad: "ஆயிடுது அதுக்கப்புறம்." },
    { start: 21.23, end: 22.57, good: "இல்ல இந்த idea போதும்.", en: "No, this idea is enough.", bad: "இல்ல இந்த [ஐடியா] போதும்." },
    { start: 22.57, end: 24.13, good: "இதுக்குள்ள அவர் music வந்துருச்சுன்னா இது", en: "If his music comes into this,", bad: "இதுக்குள்ள அவர் [மியூசிக்] வந்துருச்சுன்னா இது" },
    { start: 24.13, end: 25.41, good: "வேற மாதிரி ஆயிரும் உங்களுக்கு", en: "it will become different for you,", bad: "வேற மாதிரி ஆயிரும் உங்களுக்கு" },
    { start: 25.41, end: 26.15, good: "அப்படின்னாங்க.", en: "they said.", bad: "அப்படின்னாங்க." },
    { start: 26.15, end: 27.95, good: "See even if they gave it 3 months ago அந்த", en: "See, even if they gave it 3 months ago,", bad: "[சீ] [ஈவன்] [இஃப்] [தே] [கேவ்] [இட்] 3 [மந்த்ஸ்] [அகோ] அந்த" },
    { start: 27.95, end: 29.39, good: "last 20 days தான் நம்ம work பண்ணுவோம்.", en: "we will work only for the last 20 days.", bad: "[லாஸ்ட்] 20 [டேஸ்] தான் நம்ம [வொர்க்] பண்ணுவோம்." },
    { start: 29.39, end: 31.09, good: "Narcos மாதிரி ஒன்னு பண்ணுங்கன்றது", en: "Doing something like Narcos is a place", bad: "[நார்கோஸ்] மாதிரி ஒன்னு பண்ணுங்கன்றது" },
    { start: 31.09, end: 32.01, good: "உங்களுக்கு கொடுக்கிற ஒரு இடம்.", en: "that gives you.", bad: "உங்களுக்கு கொடுக்கிற ஒரு இடம்." },
    { start: 32.01, end: 33.81, good: "இப்ப நான் பண்ணி இது வந்து Narcos மாதிரி", en: "If I knock and say this is like Narcos,", bad: "இப்ப நான் பண்ணி இது வந்து [நார்கோஸ்] மாதிரி" },
    { start: 33.81, end: 35.94, good: "அப்படின்னு சொன்னா ஓ அப்படியா அப்படின்னு.", en: "then they will say, oh, is that so?", bad: "அப்படின்னு சொன்னா ஓ அப்படியா அப்படின்னு." },
  ],
};
