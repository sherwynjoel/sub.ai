# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Primary: freelance Tamil video editors cutting YouTube videos, reels, ads and short films for clients. They are price-sensitive, work to tight turnarounds, and live inside Premiere Pro or After Effects. Secondary (not the first voice of the site): Tamil creators who edit their own videos, and small studios/agencies subtitling at volume.

## Product Purpose
Turn a video's dialogue into timed subtitles in Tamil (Tamil script) and English, editable in the browser and importable straight into the editor's timeline, so subtitling stops being the slowest part of delivery. Success: an editor uploads a cut, fixes a few lines, and ships SRT/VTT or a caption track within minutes.

## Positioning
Built specifically for Tamil dialogue, including colloquial Tamil and Tanglish, with both languages sharing one timing, and delivered inside Premiere Pro / After Effects through a panel rather than only as a web upload.

## Operating Context
Editors work on desktop in Premiere Pro or After Effects, often late, against client deadlines. Deliverables are SRT/VTT/TXT files or caption tracks on a sequence. Payment is monthly in INR through Razorpay (UPI and cards).

## Capabilities and Constraints
- Subtitles in any of 22 Indian languages (Sarvam's list in `lib/languages.ts`), each paired with English; Tamil is the lead language in marketing.
- Upload video/audio up to 4 GB; AI transcription + translation (provider switchable by admin: Gemini default, OpenAI, Groq, custom OpenAI-compatible).
- Side-by-side Tamil/English cue editor with video preview; export SRT, VTT, TXT per language or both stacked.
- CEP panel for Premiere Pro (caption track) and After Effects (text layers), connected by an API key.
- Plans (placeholder prices in `lib/plans.ts`): Trial 15 min once, Creator ₹499/300 min, Pro ₹1,499/1,200 min, Studio ₹3,999/4,000 min.
- Videos auto-deleted after 7 days. Admin panel for operations, users, subscriptions, API connections.
- Stack: Next.js 16 App Router, plain CSS, Postgres; no heavy front-end dependencies.

## Brand Commitments
- Name "Vasanam" (Tamil for dialogue) is a working name, not final; keep it in `lib/brand.ts` so it can change.
- Standing preference (2026-10-10, latest): Gen Z, attractive, cool and clean, with liquid-glass (glassmorphism) panels over soft drifting pastel colour; black pill buttons, lime highlighter accent; site copy in English only, with Tamil in dialogue samples (no language toggle, 2026-10-10); a multilingual greeting strip (all 22 Indian languages live, each with English). Calm 3D: hero editor straightens on scroll, Premiere window tilts, glass cube.
- Rejected so far: (1) dark violet glass; (2) "release-night banner street"; (3) white/near-black/blue long page; (4) "Sunset"; (5) "Ocean" navy/aqua/coral (AI-looking); (6) "Mono" white/black only (not attractive enough).

## Evidence on Hand
The user has some real proof (testimonials, sample clips, client logos) to share later; none is in the repo yet. Until provided, the site must not invent testimonials, customer names, logos, usage numbers or accuracy figures. Reserve a place for proof without filling it with fabrications.

## Product Principles
1. Tamil first: real Tamil script and natural colloquial lines are the core promise.
2. Respect the editor's timeline: output must drop into existing tools without rework.
3. Honest and specific: concrete formats, limits and prices over hype.
4. Fast to value: the first upload should succeed without setup.
