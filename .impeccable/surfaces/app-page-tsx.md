---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/app/page.tsx","app/admin/page.tsx"]
---

## Scope
Landing page (/) in Persuade mode; the same Sunset system carries auth, app (dashboard, editor, billing, plugin) and admin in Operate mode, and the Adobe panel.

## Audience and action
Freelance Tamil video editors. Primary action: start the free trial (15 minutes, no card). Proof: user has real testimonials to supply later; the PROOF array in app/page.tsx stays empty and its section hidden until then.

## Direction contract
THESIS: A short, warm, colourful page where subtitles themselves are the hero: real Tamil and English lines arrive as a 3D stack of cards over a sunset gradient. Only what an editor needs to decide: what it does, three steps, the plugin, the price. Refuses long pages, FAQ walls, white/black schemes and themed costumes.

OWN-WORLD: Sunset gradient ground (#ff7e5f → #feb47b → #ffd29d, 160°) on landing and auth; soft peach #fff1e6 ground in the app and admin. Deep plum #3a1020 ink and pill buttons with peach text; hot pink #ff4f81 for shapes and selected states (never as text); cream #fff7ef cards; deep coral #c8314f for Tamil subtitle lines on cream; dark plum #2a0c1a video player. Bricolage Grotesque for Latin, Noto Sans Tamil for Tamil. Rounded 16–24px cards, soft plum-tinted shadows, floating circle and rounded-square shapes.

STORY: In one screen the visitor sees Tamil + English subtitle cards moving and a single "Try 15 minutes free" button; scrolling shows three one-line steps, the Premiere/After Effects panel, and four prices, then they start the trial.

FIRST VIEWPORT: Full-height sunset gradient. Top: logo left, Sign in + plum "Start free" pill right. Left column: H1 "Subtitles, in Tamil and English." (~5rem), one line "Upload a cut. Get both languages, timed.", plum button "Try 15 minutes free", note "No card needed". Right column: the 3D subtitle card stack cycling three real cues, with a pink circle and a plum rounded square drifting behind it.

FORM: Sunset colour sample #1 chosen by the user in words ("1 · Sunset gradient") from an eight-palette sample round; no concept roll. Signature interaction: the hero card stack cycles in depth (cards leave toward the viewer, the next rises from behind); step cards flip in on a 3D axis as they scroll in; the plugin panel tilts with scroll; shapes parallax with scroll and pointer.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
Brand name is a placeholder (lib/brand.ts). Real proof to be supplied by the user.
