"""Answer key maker: forced-aligns a clip's words to its audio with Meta's MMS aligner (torchaudio MMS_FA).
usage: align.py <audio.wav 16k mono> <words.json: [[cue, word_index, text], ...]> <out.json>
Writes [{cue, i, text, start, end, score}] with times in seconds."""
import json, re, sys
import torch, torchaudio

V = {"அ": "a", "ஆ": "aa", "இ": "i", "ஈ": "ii", "உ": "u", "ஊ": "uu", "எ": "e", "ஏ": "ee", "ஐ": "ai", "ஒ": "o", "ஓ": "oo", "ஔ": "au"}
S = {"ா": "aa", "ி": "i", "ீ": "ii", "ு": "u", "ூ": "uu", "ெ": "e", "ே": "ee", "ை": "ai", "ொ": "o", "ோ": "oo", "ௌ": "au"}
C = {"க": "k", "ங": "ng", "ச": "s", "ஞ": "nj", "ட": "t", "ண": "n", "த": "th", "ந": "n", "ப": "p", "ம": "m", "ய": "y", "ர": "r",
     "ல": "l", "வ": "v", "ழ": "zh", "ள": "l", "ற": "r", "ன": "n", "ஜ": "j", "ஷ": "sh", "ஸ": "s", "ஹ": "h", "க்ஷ": "ksh", "ஶ": "sh"}
PULLI = "்"


def roman(word):
    out, i = "", 0
    while i < len(word):
        ch = word[i]
        if ch in V: out += V[ch]; i += 1; continue
        if ch == "ஃ": out += "f" if i + 1 < len(word) and word[i + 1] == "ப" else "h"; i += 1; continue
        if ch in C:
            nxt = word[i + 1] if i + 1 < len(word) else ""
            if ch == "ப" and i > 0 and word[i - 1] == "ஃ": base = ""  # ஃப = f, already written
            else: base = C[ch]
            if nxt == PULLI: out += base; i += 2
            elif nxt in S: out += base + S[nxt]; i += 2
            else: out += base + "a"; i += 1
            continue
        if re.match(r"[a-zA-Z']", ch): out += ch.lower()
        i += 1
    return re.sub(r"[^a-z']", "", out)


def main(wav, words_path, out_path):
    words = json.load(open(words_path))
    bundle = torchaudio.pipelines.MMS_FA
    model, tok, aligner = bundle.get_model(with_star=False), bundle.get_tokenizer(), bundle.get_aligner()
    wave, sr = torchaudio.load(wav)
    assert sr == bundle.sample_rate
    keep = [(w, roman(w[2])) for w in words]
    keep = [(w, r) for w, r in keep if r]
    with torch.inference_mode():
        # Emissions in 30 s windows with 1 s overlap trimmed, so long clips stay in memory.
        frames, step = [], sr * 30
        for s in range(0, wave.size(1), step):
            seg = wave[:, max(0, s - sr):min(wave.size(1), s + step + sr)]
            em, _ = model(seg)
            fps = em.size(1) / seg.size(1)
            a = round((s - max(0, s - sr)) * fps)
            b = a + round(min(step, wave.size(1) - s) * fps)
            frames.append(em[:, a:b])
        emission = torch.cat(frames, 1)
        spans = aligner(emission[0], tok([r for _, r in keep]))
    ratio = wave.size(1) / emission.size(1) / sr
    out = []
    for (w, r), sp in zip(keep, spans):
        out.append({"cue": w[0], "i": w[1], "text": w[2], "roman": r, "start": round(sp[0].start * ratio, 3),
                    "end": round(sp[-1].end * ratio, 3), "score": round(sum(t.score * len(t) for t in sp) / sum(len(t) for t in sp), 3)})
    json.dump(out, open(out_path, "w"), ensure_ascii=False, indent=0)


if __name__ == "__main__":
    main(*sys.argv[1:])
