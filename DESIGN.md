---
name: Vasanam
description: Tamil and English subtitles on a sunset; plum ink, pink shapes, cream cards.
colors:
  sunset-orange: "#ff7e5f"
  sunset-apricot: "#feb47b"
  sunset-peach: "#ffd29d"
  plum: "#3a1020"
  plum-2: "#5a1f33"
  pink: "#ff4f81"
  pink-soft: "#ffe0e8"
  cream: "#fff7ef"
  coral: "#c8314f"
  ground: "#fff1e6"
  ground-2: "#ffe6d4"
  ink-2: "#5a2a38"
  muted: "#7a4a55"
  line: "rgba(58, 16, 32, .16)"
  line-soft: "rgba(58, 16, 32, .09)"
  line-hi: "rgba(58, 16, 32, .28)"
  video: "#2a0c1a"
  subtitle-peach: "#ffd29d"
  field: "#ffffff"
  green: "#1d7a45"
  red: "#c22436"
  amber: "#a14f00"
typography:
  display:
    fontFamily: "Bricolage Grotesque, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 6.4vw, 5.2rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Bricolage Grotesque, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.2rem)"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Bricolage Grotesque, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "1.35rem"
    fontWeight: 700
    lineHeight: 1.2
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Bricolage Grotesque, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "Bricolage Grotesque, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 1.8vw, 1.4rem)"
    fontWeight: 500
    lineHeight: 1.55
  label:
    fontFamily: "Bricolage Grotesque, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "0.92rem"
    fontWeight: 600
    lineHeight: 1.4
  tamil-line:
    fontFamily: "Noto Sans Tamil, Bricolage Grotesque, sans-serif"
    fontSize: "clamp(1.1rem, 1.8vw, 1.4rem)"
    fontWeight: 700
    lineHeight: 1.35
rounded:
  sm: "12px"
  lg: "22px"
  card: "24px"
  sheet: "28px"
  pill: "999px"
spacing:
  gutter: "20px"
  container: "1120px"
  stack: "24px"
  panel: "24px"
  section: "96px"
components:
  button-primary:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.sunset-peach}"
    rounded: "{rounded.pill}"
    padding: "0.95em 1.5em"
  button-primary-hover:
    backgroundColor: "{colors.plum-2}"
    textColor: "{colors.sunset-peach}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.plum}"
    rounded: "{rounded.pill}"
    padding: "0.95em 1.5em"
  button-small:
    rounded: "{rounded.pill}"
    padding: "0.62em 1.05em"
  input:
    backgroundColor: "{colors.field}"
    textColor: "{colors.plum}"
    rounded: "{rounded.sm}"
    padding: "0.7em 0.9em"
  panel:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    rounded: "{rounded.lg}"
    padding: "{spacing.panel}"
  cue-card:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    rounded: "{rounded.lg}"
    padding: "20px 24px 18px"
  plan-card:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    rounded: "{rounded.card}"
    padding: "26px 24px"
  plan-card-featured:
    backgroundColor: "{colors.pink}"
    textColor: "{colors.plum}"
  auth-card:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.plum}"
    rounded: "{rounded.sheet}"
    padding: "40px 36px 32px"
  step-number:
    backgroundColor: "{colors.plum}"
    textColor: "{colors.sunset-peach}"
    rounded: "{rounded.pill}"
    size: "44px"
  video-player:
    backgroundColor: "{colors.video}"
    textColor: "{colors.subtitle-peach}"
    rounded: "{rounded.lg}"
---

# Design System: Vasanam

## Overview

**Creative North Star: "Subtitles at Golden Hour"**

The whole system is a warm sunset that subtitles float across. A 160° gradient from orange through apricot to peach is the ground of every arrival surface (landing hero, auth, the app header band); deep plum carries all ink and every primary action; hot pink exists only as shape and selection; cream cards hold the actual words. The product's real material, a timed Tamil line with its English twin, is the hero object, shown as soft cream cards stacked in 3D depth rather than as a screenshot of a tool.

Pages are short and colourful. The landing is one screen of sunset, then a peach-to-orange flow holding three numbered steps and a tilting plugin panel, then a plum pricing band that runs into a plum footer. Nothing else. Operate surfaces (dashboard, editor, billing, plugin, admin) keep the same voice at lower volume: the sunset shrinks to a sticky header band with rounded bottom corners, the ground turns to soft peach, and work happens on cream panels.

Motion is playful but purposeful: cards leave toward the viewer, step rows flip up on a 3D axis as they arrive, the plugin panel straightens as it scrolls in, and two simple shapes (a pink circle, a plum rounded square) drift and parallax behind the hero. All of it stops under reduced motion and none of it hides content without JS.

**Key Characteristics:**
- Sunset gradient ground on arrival surfaces; soft peach ground on work surfaces.
- Plum ink and plum pill buttons with peach text; pink for shapes and selection only.
- Cream cards with generous 22–28px corners and soft plum-tinted shadows.
- One family, Bricolage Grotesque, at heavy display weights with tight tracking; Noto Sans Tamil for every Tamil glyph.
- 3D depth motion (stack, flip, tilt) and slow drifting geometric shapes.
- Short pages: hero, three steps, plugin, price.

## Colors

A warm, saturated sunset palette held together by one dark plum; there is no white page and no black page anywhere in the system.

### Primary
- **Deep Plum** (plum): all text, headings, primary buttons, step numbers, the logo tile, the pricing band and the footer. It is the system's only dark and its only action colour.
- **Plum Dusk** (plum-2): hover state of plum buttons; secondary copy set directly on the sunset (notes, step lines) where muted would lose contrast.

### Secondary
- **Hot Pink** (pink): the drifting hero circle, the playing-cue progress bar, focus outlines, caret, text selection, the selected cue and picked plan rings, the featured price card, the plugin meter. A shape and state colour, never a text colour.
- **Blush** (pink-soft): notice backgrounds and the drag-over state of the upload well.

### Tertiary
- **Sunset Orange / Apricot / Peach** (sunset-orange, sunset-apricot, sunset-peach): the three stops of the sunset gradient (160°, 0% / 55% / 100%). Peach also serves alone as the text colour on plum (buttons, pricing band, footer) and as the plugin's primary button.
- **Subtitle Coral** (coral): Tamil subtitle lines set on cream; the only reddish text in the system.

### Neutral
- **Cream** (cream): every card and panel surface: cue cards, plan cards, auth card, app panels, the job list rows.
- **Peach Ground** (ground): page background of app and admin.
- **Deeper Peach** (ground-2): wells, inline code, meter tracks, disabled buttons, hover on quiet row tools.
- **Plum Ink 2** (ink-2) and **Muted Plum** (muted): label text, and secondary copy on cream (muted holds 6.5:1 on cream).
- **Plum Lines** (line, line-soft, line-hi): every border and divider is plum at 16%, 9% or 28% alpha; there are no grey lines.
- **Video Plum** (video): the editor's video player, the landing's mini plugin panel and the Adobe panel ground. Subtitles over it are **Subtitle Peach** (subtitle-peach) with white English lines.
- **Field White** (field): the inside of form inputs only.
- **Status** (green, red, amber): done / failed / waiting, always paired with a word and a dot, never colour alone.

### Named Rules
**The Pink Never Speaks Rule.** Hot pink is never used for text. It fills shapes, bars, rings, outlines and selections; text sitting on pink is plum.

**The One Dark Rule.** Plum is the only dark. Text, buttons, bands and the video surface are all plum or plum-black; no neutral greys and no pure black.

**The Sunset Arrives First Rule.** The gradient belongs to arrival: the landing hero, the auth page, the app header band. Work surfaces sit on flat peach so cream panels and content stay calm.

## Typography

**Display Font:** Bricolage Grotesque (with Noto Sans Tamil, system-ui)
**Body Font:** Bricolage Grotesque (with Noto Sans Tamil, system-ui)
**Tamil Font:** Noto Sans Tamil, applied to every `lang="ta"` run

**Character:** A single expressive grotesque used loud at the top (800 weight, -0.035em tracking, line-height 1) and plain below; Noto Sans Tamil sits beside it at matching weight so Tamil script never falls back to a system face.

### Hierarchy
- **Display** (800, clamp(2.8rem, 6.4vw, 5.2rem), 1): the landing H1 only, held to about 9ch so it breaks into three heavy lines.
- **Headline** (800, clamp(2rem, 4vw, 3.2rem), 1): section headings (plugin, pricing) and app page titles (clamp up to 3.2rem).
- **Title** (700, 1.35rem, 1.2): card and panel headings; step titles scale up to 1.9rem on the landing.
- **Lede** (500, clamp(1.15rem, 1.8vw, 1.4rem)): the single supporting line under the hero H1.
- **Body** (400, 17px, 1.55): all running copy, max 60ch.
- **Label** (600, 0.92rem): form labels, nav links (0.95rem), notes and tags.
- **Tamil Line** (700, clamp(1.1rem, 1.8vw, 1.4rem), 1.35, coral on cream): the Tamil half of a subtitle card.
- **Prices and stats** (800, 2.3rem, -0.04em on landing; 600, 1.9rem in admin): numbers in tabular figures.

### Named Rules
**The Two Scripts, One Voice Rule.** Every subtitle shows Tamil first, larger and heavier, with its English twin below at body size. Never English alone where the product promise is shown.

**The Heavy Top Rule.** Headings are 800 weight with negative tracking and balanced wrapping; everything below the heading drops to regular or medium. No intermediate shouting.

## Layout

A single centred container (min(1120px, 100% − 40px)) on every surface. The landing hero is a full-viewport sunset with a two-column grid (copy 1fr, card stack 1.05fr), collapsing to one column under 900px. Below it, a continuous peach-to-orange flow (`#ffd29d → #feb47b → #ff8f6b`, overlapping the hero by 44px) holds a three-column step strip joined by a thin plum rule and a two-column plugin teaser; then a full-bleed plum band holds four price cards (two columns under 900px). Section padding is about 96px top, 56–120px bottom.

The app is a sticky sunset header band (68px row, 28px rounded bottom corners) over a peach ground; main content is a 24px-gap vertical stack with 36px top padding. The editor is a 1.15fr / 1fr split with a sticky video column at top 84px, collapsing under 960px. Admin is a 180px sticky side nav plus content, becoming a horizontal scrolling nav under 900px.

**The Four Sections Rule.** The landing is hero, three steps, plugin, pricing (plus a proof section only when real proof exists). New information earns a place only by replacing something.

## Elevation & Depth

A soft, lifted hybrid: cream surfaces sit on peach with very quiet plum-tinted shadows plus a 1px plum hairline ring; signature objects (cue cards, plugin panel, auth card) get deep, blurred plum drop shadows with negative spread so they look like they float in warm light. Real 3D transforms carry most of the depth: the card stack lives in perspective(1100px) with cards stepped back 70px each.

### Shadow Vocabulary
- **Hairline lift** (`box-shadow: 0 2px 6px rgba(58,16,32,.06), 0 0 0 1px rgba(58,16,32,.09)`): app panels, active admin nav item, pressed segmented button.
- **Float** (`box-shadow: 0 18px 40px -18px rgba(58,16,32,.35)`): auth card.
- **Cue float** (`box-shadow: 0 24px 40px -18px rgba(58,16,32,.55)`): subtitle cards in the hero stack.
- **Panel float** (`box-shadow: 0 30px 60px -24px rgba(58,16,32,.6)`): the tilting plugin mini panel.
- **Button glow** (`box-shadow: 0 10px 20px -10px rgba(58,16,32,.6)`; hover `0 14px 24px -10px rgba(58,16,32,.65)`): plum pill buttons.
- **Header band** (`box-shadow: 0 10px 24px -18px rgba(58,16,32,.5)`): the sticky app header.

### Named Rules
**The Warm Shadow Rule.** Every shadow is plum-tinted and blurred with negative spread. No grey or black shadows, no hard offsets.

## Shapes

Soft and rounded throughout. Inputs, rows and wells use 12px; panels, cue cards and the video player 22px; price and proof cards 24px; the auth card and app header band 28px; every button, nav link, tag and step number is a full pill or circle. Two free shapes recur as decoration: a hot-pink circle and a plum rounded square (30px corners), drifting slowly (7–9s, 14° rotate, 1.06 scale) and moving with scroll and pointer. The logo is a 26px plum tile (9px radius) with a peach bar over a shorter pink bar, a drawn subtitle.

## Components

### Buttons
Confident plum pills that lift slightly when touched.
- **Shape:** full pill (999px).
- **Primary:** plum fill, peach text, 700 weight, 0.95em 1.5em padding, button glow shadow.
- **Hover / Focus:** plum-2 fill, rises 2px with a deeper glow; active scales to 0.98; focus is a 3px pink outline at 2px offset.
- **Ghost:** transparent with a 2px inset plum ring and plum text; hover fills plum at 6%.
- **Small:** 0.62em 1.05em, 0.9rem.
- **Danger:** transparent with red text and a 40% red inset ring.
- **Disabled:** deeper-peach fill, muted text, no shadow.

### Cards / Containers
- **Corner Style:** 22px panels, 24px price cards, 28px auth card.
- **Background:** cream on peach or sunset; the featured price card is pink.
- **Shadow Strategy:** hairline lift for work panels; floats for signature objects (see Elevation).
- **Border:** none on panels (the hairline ring stands in); list rows and stats use a 1px plum line that darkens on hover.
- **Internal Padding:** 24px panels; 26px 24px price cards; 40px 36px auth.
- **Hover:** list rows slide 4px right; stats and price cards rise (price cards also tilt -1°).

### Inputs / Fields
- **Style:** white fill, 1.5px plum-16% border, 12px radius, 0.7em 0.9em padding; labels above at 600 weight in ink-2.
- **Focus:** border turns pink with a 4px pink-20% halo; no outline.
- **Select:** custom plum chevron, no native arrow.
- **Error:** red text at 0.92rem below the field.

### Navigation
- **Style:** logo left; links are plum 600-weight pills (0.5em 0.85em) whose hover and current state is plum at 8% fill. The primary call is a small plum pill.
- **App:** nav centred in the sunset header band, minutes meter and a quiet muted "Sign out" text action on the right; under 720px the nav wraps to its own row.
- **Admin:** vertical side list; current item becomes a cream chip with the hairline lift.

### Subtitle Cue Card (signature)
A cream card (22px) holding a muted timecode, a coral Tamil line and a plum English line, with a 3px progress bar that fills pink over three seconds. Three cards stack in depth (each 70px further back, tinted toward peach) inside a tilted 3D stage that flattens as the page scrolls and turns with the pointer. Every three seconds the front card exits toward the viewer (forward and down, fading) and the next rises into place. Labelled "Sample subtitles" on a cream pill tag.

### Step Strip
Three numbered steps, each a plum circle with a peach numeral, a 1.9rem title and one plum-2 line, joined by a 2px plum-25% rule. Each step flips up from -48° on the X axis as it scrolls in, staggered 0.14s.

### Plugin Mini Panel
A video-plum card (20px) mimicking the Adobe panel: a header bar, two label/value rows in translucent cream chips, a pink progress track and a peach pill. It tilts in 3D and straightens as it crosses the viewport (scroll-driven where supported).

### Editor Surfaces
The video player is video-plum, 22px, 16:9, with peach subtitles and white English beneath, each with a dark text shadow. Cue rows are cream with plum lines; the active cue gets a pink border and 3px pink-25% ring. A segmented control sits on plum-9% with the pressed option on cream.

### Adobe Panel
The same world inverted: video-plum ground, cream text, plum-pink fields at 8px radius, peach pill buttons with plum text, a pink meter, bundled Bricolage Grotesque.

## Do's and Don'ts

### Do:
- **Do** use the sunset gradient (`linear-gradient(160deg, #ff7e5f 0%, #feb47b 55%, #ffd29d 100%)`) as the ground for arrival surfaces and the app header band.
- **Do** set all text in plum; use peach for text on plum surfaces.
- **Do** keep hot pink to shapes, bars, rings, selection and focus.
- **Do** show real Tamil script (coral, 700) above its English twin whenever the product is demonstrated.
- **Do** put content on cream cards with 22–28px corners and plum-tinted shadows.
- **Do** make every button, tag and nav link a full pill.
- **Do** keep pages short: hero, three steps, plugin, pricing.
- **Do** give 3D motion a reduced-motion fallback and keep content visible without JS.
- **Do** pair every status colour with a word and a dot.

### Don't:
- **Don't** use pink as a text colour.
- **Don't** build long pages or FAQ walls; the user rejected the long premium product page.
- **Don't** use white or black page schemes (white or near-black grounds with a single blue accent were rejected).
- **Don't** bring back dark violet glass, aurora backgrounds or gradient text (rejected).
- **Don't** dress the product in a themed costume such as the green/yellow enamel "banner street" with condensed lettering (rejected).
- **Don't** use grey lines, grey text or black shadows; tint them plum.
- **Don't** invent testimonials, logos, usage numbers or accuracy figures to fill the proof slot.
