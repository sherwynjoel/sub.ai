---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/app/page.tsx","app/admin/page.tsx"]
---

## Scope
Landing page (/) in Persuade mode; the same system carries auth, app (dashboard, editor, billing, plugin) and admin in Operate mode, and the Adobe panel.

## Audience and action
Freelance Tamil video editors. Primary action: start the free trial (15 minutes, no card). Proof: user has real testimonials/clips/logos to supply later; none may be invented (PROOF array in app/page.tsx stays hidden while empty).

## Direction contract
THESIS: The product is the hero. Show the real Vasanam editor big and exact, the way premium tech products show their device, and let typography and space do the persuading. Refuses themed costumes, glow, gradient text and condensed display type.

OWN-WORLD: Light ground (#fbfbfd / #f5f5f7 sections), near-black ink #1d1d1f, one accent, signal blue #1557ff, used for actions and links only. Product surfaces are dark (#111113 / #1c1c1f) with subtitle yellow #ffd60a, like a device on a white page. Geist for all Latin text at normal width, tight tracking on display sizes; Noto Sans Tamil for Tamil; Geist Mono only for timecodes. Pill buttons, 12–20px radii, hairline borders, soft offset shadows under product shots only.

STORY: The visitor sees their own Tamil dialogue subtitled in both languages inside a real-looking editor, understands the four steps from upload to timeline, sees honest formats and prices, and starts the free trial.

FIRST VIEWPORT: Centered, no label above it: the H1 "Tamil and English subtitles. In minutes." at ~5.5rem, one sentence of subcopy, two buttons (blue "Start free" pill, text link "See how it works"), "15 minutes free. No card needed." Below, filling the width and bleeding past the fold: the dark editor shot (video with painting subtitle, Tamil/English cue list, timeline) tilted back in 3D.

FORM: Category standard executed at full craft (canon path chosen by the user in words: "Premium tech product, like Apple / Linear / Vercel"); no concept roll. References that set the bar: apple.com product pages, linear.app, vercel.com. Signature interaction: the hero editor straightens from a 3D tilt to flat as you scroll; "How it works" pins the product panel while four steps scroll past and the panel changes state.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
Brand name is a placeholder (lib/brand.ts). Real proof and a real sample clip to be supplied by the user; the hero video pane uses a synthetic frame labelled "Sample".
