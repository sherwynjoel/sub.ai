# Timing check

Measures how close Vasanam's captions are to when the words are really said.

## The answer key

`keys/<clip>.key.json` lists every word of a clip with its real start and end in seconds. The keys were made with
`align.py`, which force-aligns the words to the audio with Meta's MMS aligner (a speech model that places each
letter in the sound). Words it isn't sure of (`score` under 0.3) are left out of the scoring.

| Key | Clip | Length | Speech |
|---|---|---|---|
| c1 | `3.mp4` | 19 s | English, fast (business ad) |
| c2 | `2 chennai.MP4` | 66 s | Tamil, conversational |
| c3 | `04d030a0-….MP4` | 38 s | Tamil |
| c4 | `f322d5bf-….MP4` | 28 s | Tamil with English words (doctor) |
| c5 | `Untitled design.mp4` | 53 s | A song: music under the voice, a hard case |

The videos aren't in the repo. Put them in one folder named `c1.mp4` … `c5.mp4`, each with a 16 kHz mono WAV of
its audio next to it (`afconvert -f WAVE -d LEI16@16000 -c 1 c1.mp4 c1.wav` on a Mac, or
`ffmpeg -i c1.mp4 -ac 1 -ar 16000 c1.wav`).

## Run it

```bash
VASANAM_URL=https://… VASANAM_KEY=vsn_… npx tsx scripts/timing-check.ts ~/timing-clips --upload
```

This subtitles every clip on that server (as a Tamil-script project, using the account's minutes), then prints:

- **word start ±0.2s**: share of words whose highlight starts within 0.2 s of the real start
- **caption start ±0.2s**: share of captions that come up within 0.2 s of their first word
- **off captions**: captions that start 0.5 s or more off, or end 0.3 s or more before their last word is said
- **flagged / flags right / off found**: how the editor's "Check timing" warnings did against the key

Without `--upload` it scores the results saved by the last run (`<clip>.out.json`).

## A key for a new clip

```bash
python3 -m venv venv && venv/bin/pip install torch==2.5.1 torchaudio==2.5.1
# words.json: [[caption, word_index, "word"], …] in the order spoken (Tamil or English letters)
venv/bin/python -I align.py clip.wav words.json clip.key.json
```

Spot-check a few words by ear before trusting a new key.
