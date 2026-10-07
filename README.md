# Vasanam — Tamil & English subtitles for editors

Upload a video → get timed subtitles in **Tamil (Tamil script)** and **English** → edit them in the browser →
download SRT/VTT/TXT or import straight into **Premiere Pro / After Effects** with the panel. Monthly plans via Razorpay.

```
web (Next.js)  ── upload ──▶ storage/  ──▶  worker.ts ── ffmpeg → 5-min mp3 chunks ──▶ AI provider ──▶ cues (Postgres)
Adobe panel ── same API with "Authorization: Bearer <key>"
```

## Run locally

```bash
docker compose up -d            # Postgres on :5434
cp .env.example .env.local      # fill in keys (see below)
npm install
npx drizzle-kit migrate         # uses DATABASE_URL (run with --env-file or export it)
npm run dev                     # web on :3000
npm run worker                  # second terminal: processes uploads
npm test                        # unit checks; plus: node plugin/subs.test.js
```

Needs **ffmpeg/ffprobe** on PATH (or `FFMPEG_DIR`). The account whose email equals `ADMIN_EMAIL` becomes admin at sign-up.

## Switching the AI model

`/admin → Subtitle AI` (stored in DB, no redeploy). Env vars are the fallback.

| Provider | How it works | Keys | Notes |
|---|---|---|---|
| `gemini` (default) | One call: hears the audio, returns Tamil + English cues | `GEMINI_API_KEY` | Best value. `gemini-2.5-flash`; try `gemini-2.5-pro` for hard audio |
| `openai` | Whisper timings → GPT writes Tamil + English | `OPENAI_API_KEY` | `whisper-1` + `gpt-4.1-mini` |
| `groq` | Fast Whisper → Llama translation | `GROQ_API_KEY` | Cheapest STT; Tamil translation weaker |
| `custom` | Any OpenAI-compatible API (OpenRouter, Together, local) | `AI_BASE_URL`, `AI_API_KEY` | |

Adding a provider = one file in `lib/ai/` exporting a `Provider`, plus one line in `transcribe()` (`lib/ai/index.ts`).
Each project stores which provider/model made it, so you can compare quality in `/admin`.

## Razorpay subscriptions

1. Razorpay Dashboard → Subscriptions → Plans: create **Creator ₹499**, **Pro ₹1,499**, **Studio ₹3,999** (monthly). Paste the plan ids into `RAZORPAY_PLAN_CREATOR/PRO/STUDIO`. Prices/minutes shown on the site live in `lib/plans.ts` — keep them in sync.
2. API keys → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` (start with Test mode keys).
3. Webhooks → URL `https://<domain>/api/billing/webhook`, secret → `RAZORPAY_WEBHOOK_SECRET`, events: all `subscription.*`.

Usage resets on every `subscription.charged`. Cancelling keeps the plan until the period ends. Failed jobs refund their minutes.

## Adobe panel (Premiere Pro + After Effects, CEP)

- Source: `plugin/`. Build the signed installer (downloads Adobe's ZXPSignCmd on first run):
  `powershell -File plugin/build.ps1 -Server https://<your-domain>` → `public/downloads/vasanam-panel.zxp` (served at `/downloads/vasanam-panel.zxp`).
- Users install it with the free ZXP Installer; steps are on `/app/plugin`.
- Dev without packaging: copy `plugin/` to `%APPDATA%\Adobe\CEP\extensions\vasanam` (mac: `~/Library/Application Support/Adobe/CEP/extensions/vasanam`) and enable unsigned panels:
  `reg add HKCU\Software\Adobe\CSXS.11 /v PlayerDebugMode /t REG_SZ /d 1` (repeat for CSXS.12).
- Premiere: select a clip on the timeline (captions land at its position, trimmed to its in/out) or in the Project panel (captions start at the playhead). After Effects: select a footage layer; one text layer per cue.

## Deploy (Ubuntu VPS / EC2)

```bash
sudo apt install -y ffmpeg postgresql nginx && npm i -g pm2
# set DATABASE_URL, APP_URL=https://<domain>, keys … in .env.local
npm ci && npx drizzle-kit migrate && npm run build
pm2 start "npm start" --name vasanam-web
pm2 start "npm run worker" --name vasanam-worker
pm2 save && pm2 startup
```

nginx in front with TLS (certbot) and **`client_max_body_size 4g; proxy_request_buffering off;`** so large uploads stream.
Uploaded videos are deleted automatically after 7 days.

## Known limits (deliberate, upgrade when needed)

- One worker process (`worker.ts` notes how to scale).
- Uploads are single-request (no resume); fine up to a few GB on stable connections.
- The panel uploads the whole source clip and is charged its full length even if only part is used on the timeline.
- Plan switching = cancel then subscribe again.
- Files on local disk; move `storage/` to S3/R2 when running more than one server.
