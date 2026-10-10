---
version: 1
slug: "app-page-tsx"
primary_target: "app/page.tsx"
related_targets: ["app/app/page.tsx","app/admin/page.tsx"]
---

## Scope
Landing page (/) in Persuade mode; the same Mono system carries auth, app (dashboard, editor, billing, plugin), admin and the Adobe panel.

## Audience and action
Freelance Tamil video editors. Primary action: start the free trial (15 minutes, no card). Proof stays hidden (PROOF array empty) until the user supplies real testimonials.

## Direction contract
THESIS: A rich, playful-but-professional product page where everything responds: the editor window follows your mouse, tiles lean into the cursor, plans flip, cards bounce, a cube of formats spins. It must read as a real paid tool, not a template.

OWN-WORLD: Mono. White #fff ground, black #0a0a0a ink and primary, greys only as black at lower strength (#f5f5f5, #e5e5e5, #ccc, #666). Instrument Sans 600 headlines + Noto Sans Tamil. Black pill buttons, hairline borders, 8/14px radii, one soft neutral shadow on product windows. Product shots are black windows on white. State by word and shape, never hue.

STORY: The visitor sees a live editor with Tamil and English subtitles, plays with the 3D pieces, understands features, steps and prices in a few scrolls, and starts the free trial.

FIRST VIEWPORT: Nav (logo, Features, How it works, Pricing, Sign in, aqua Start free). Left: H1 "Your dialogue, subtitled in two languages." (~4.6rem, "subtitled" in aqua), one line, aqua "Try 15 minutes free", ghost "See how it works". Right: the 3D editor window (video + subtitle, cue list, timeline) tilting with the mouse, with floating chips ".SRT ready", "தமிழ் ✓", "English ✓" at 3D depth.

FORM: User brief (2026-10-10): "light and normal", "only white and black", normal landing page with 3D animations and scrolling effects, not AI-looking. Signature motion: hero editor tipped back that straightens on scroll; Premiere window swings in and leans to the pointer; slow cube; step line fills on scroll. Authority: the user's direct instruction.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

## Unresolved
- Hero video frame is an illustrated two-shot placeholder labelled "Sample clip"; swap in a real frame from the user's sample clip when provided.
Brand name is a placeholder (lib/brand.ts). Real proof and a real sample clip to be supplied by the user.
