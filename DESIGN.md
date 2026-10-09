---
name: Vasanam
description: Tamil and English subtitles, shown on the real editor like a device on a white page.
colors:
  signal-blue: "#1557ff"
  signal-blue-hover: "#0a47e6"
  blue-wash: "#eaf0ff"
  ground: "#fbfbfd"
  ground-alt: "#f5f5f7"
  surface: "#ffffff"
  ink: "#1d1d1f"
  ink-secondary: "#424245"
  muted: "#6e6e73"
  hairline: "#d2d2d7"
  hairline-soft: "#e8e8ed"
  success: "#1a7f37"
  error: "#d70015"
  warning: "#b25000"
  device: "#111113"
  device-raised: "#1c1c1f"
  device-well: "#2a2a2e"
  device-line: "#38383d"
  device-ink: "#f5f5f7"
  device-muted: "#a1a1a6"
  device-blue: "#5b8cff"
  subtitle-yellow: "#ffd60a"
typography:
  display:
    fontFamily: "Geist, Noto Sans Tamil, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2.6rem, 6.2vw, 5.4rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Geist, Noto Sans Tamil, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(2rem, 4.2vw, 3.5rem)"
    fontWeight: 600
    lineHeight: 1.05
    letterSpacing: "-0.035em"
  title:
    fontFamily: "Geist, Noto Sans Tamil, system-ui, -apple-system, sans-serif"
    fontSize: "1.3rem"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.02em"
  lede:
    fontFamily: "Geist, Noto Sans Tamil, system-ui, -apple-system, sans-serif"
    fontSize: "clamp(1.1rem, 1.6vw, 1.3rem)"
    fontWeight: 400
    lineHeight: 1.5
  body:
    fontFamily: "Geist, Noto Sans Tamil, system-ui, -apple-system, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "Geist, Noto Sans Tamil, system-ui, -apple-system, sans-serif"
    fontSize: "0.9rem"
    fontWeight: 500
    lineHeight: 1.4
  tamil:
    fontFamily: "Noto Sans Tamil, Geist, sans-serif"
    fontSize: "clamp(2rem, 5.2vw, 4.2rem)"
    fontWeight: 600
    lineHeight: 1.25
    letterSpacing: "-0.01em"
  timecode:
    fontFamily: "Geist Mono, ui-monospace, monospace"
    fontSize: "11px"
    fontWeight: 400
    letterSpacing: "0"
    fontFeature: "tnum"
rounded:
  inner: "6px"
  sm: "10px"
  device: "18px"
  lg: "20px"
  pill: "999px"
spacing:
  gutter: "20px"
  stack: "24px"
  section-gap: "64px"
  section: "140px"
  section-compact: "96px"
components:
  button-primary:
    backgroundColor: "{colors.signal-blue}"
    textColor: "{colors.surface}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0.85em 1.35em"
  button-primary-hover:
    backgroundColor: "{colors.signal-blue-hover}"
    textColor: "{colors.surface}"
  button-primary-disabled:
    backgroundColor: "{colors.hairline-soft}"
    textColor: "{colors.muted}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0.85em 1.35em"
  button-ghost-hover:
    backgroundColor: "{colors.ground-alt}"
  button-small:
    rounded: "{rounded.pill}"
    padding: "0.6em 1em"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.error}"
    rounded: "{rounded.pill}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "0.7em 0.85em"
  panel:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "24px"
  nav-link:
    textColor: "{colors.ink-secondary}"
    rounded: "{rounded.pill}"
    padding: "0.45em 0.75em"
  nav-link-active:
    backgroundColor: "{colors.ground-alt}"
    textColor: "{colors.ink}"
  device-window:
    backgroundColor: "{colors.device}"
    textColor: "{colors.device-ink}"
    rounded: "{rounded.device}"
  device-titlebar:
    backgroundColor: "{colors.device-raised}"
    height: "44px"
  segmented-control:
    backgroundColor: "{colors.hairline-soft}"
    rounded: "{rounded.sm}"
    padding: "3px"
  notice:
    backgroundColor: "{colors.blue-wash}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    padding: "10px 14px"
---

# Design System: Vasanam

## Overview

**Creative North Star: "The Device on the White Page"**

Vasanam presents itself the way premium hardware and developer tools present themselves: a quiet, light page that steps aside so the product can be shown big and exact. The page is near-white with near-black ink; the product (the subtitle editor, the Premiere window, the plugin panel) is rendered as a dark device sitting on it, with subtitle yellow living only inside that device. One signal blue carries every action and link. Typography and space do the persuading: large, tightly tracked Geist headlines, generous section padding, and no decoration beyond hairlines and soft shadow under the product.

Density changes with the job. Persuade surfaces (the landing page) are spacious and centered, with 140px section rhythm and a single idea per section. Operate surfaces (auth, app, admin) are calm and compact: light panels on a pale well, hairline-bordered rows, pill navigation, the same blue for actions. Motion is limited to a few deliberate ideas: a gentle rise on entry, the hero device straightening from a 3D tilt as you scroll, and a pinned product panel that changes state as steps pass.

This world replaces two rejected ones and must not drift back toward either: the glassy violet/aurora/gradient-text dark UI (read as AI-generated), and the themed "release-night banner street" (green/yellow enamel boards, bamboo, floodlights, condensed lettering; read as gimmicky, cramped and not premium).

**Key Characteristics:**
- Light ground, near-black ink, one signal blue for actions and links only.
- The product is a dark device on the light page; subtitle yellow appears only inside it.
- Geist at normal width with tight tracking on display sizes; Noto Sans Tamil for Tamil; Geist Mono only for timecodes.
- Pill buttons and pill nav, 10px fields, 20px panels, hairline borders.
- Soft, diffuse shadows; the heavy shadow belongs to product shots alone.
- Motion is few and smooth: rise on entry, tilt-to-flat on scroll, pinned state changes.

## Colors

A near-monochrome light system with one blue voice, plus a separate dark device palette that carries subtitle yellow.

### Primary
- **Signal Blue** (signal-blue): Every primary button, every link, focus rings, caret, selection tint, the active cue border in the editor, and checkmarks in plan lists. Hover deepens to **Pressed Blue** (signal-blue-hover). **Blue Wash** (blue-wash) is its quiet tint for notices and the drag-over upload state.
- **Device Blue** (device-blue): The lighter blue used inside dark product surfaces for playheads, progress fills, editing outlines and the plugin's links, where Signal Blue would be too dark against the device.

### Secondary
- **Subtitle Yellow** (subtitle-yellow): Subtitles as they appear on screen (Tamil line in yellow, English line in white, both with a hard legibility text-shadow), the active cue in product shots, caption clips on timelines, and the stroke inside the logo mark. It exists only on dark device surfaces.

### Neutral
- **Ground** (ground): Page background on Persuade surfaces and the translucent sticky header.
- **Ground Alt** (ground-alt): Alternating sections (How it works, Pricing), the auth page well, ghost-button and nav hover fills.
- **Surface** (surface): Cards, panels, inputs, the plans table, and white button text.
- **Ink** (ink): Headlines and body text; also the logo tile and usage-meter fill.
- **Ink Secondary** (ink-secondary): Lede paragraphs, labels, nav links at rest.
- **Muted** (muted): Notes, descriptions, table headers, stat labels (5.1:1 on white).
- **Hairline** (hairline) and **Hairline Soft** (hairline-soft): Field borders, list and FAQ dividers, panel and table borders, disabled button fill.
- **Status** (success, error, warning): Job state, admin status dots and danger actions; always paired with a word, never colour alone.
- **Device** (device), **Device Raised** (device-raised), **Device Well** (device-well), **Device Line** (device-line): The dark product body, its title bar and timeline strip, active chips and clips, and its internal dividers. **Device Ink** and **Device Muted** are the text pair on these surfaces.

### Named Rules
**The One Voice Rule.** Signal Blue is the only accent on light surfaces and it means "act" or "go": buttons, links, focus, selection. It is never used for decoration, headings or backgrounds larger than a notice.

**The Yellow Lives in the Device Rule.** Subtitle Yellow appears only on dark device surfaces, as subtitle text, active-cue highlight or caption clips. The one exception is the logo mark, itself a tiny dark screen carrying a subtitle stroke. It never appears on the light page as an accent, fill or button.

## Typography

**Display Font:** Geist (with Noto Sans Tamil, system-ui, -apple-system fallback)
**Body Font:** Geist (same stack)
**Tamil Font:** Noto Sans Tamil, applied to every `lang="ta"` element
**Label/Mono Font:** Geist Mono, for timecodes and file extensions only

**Character:** One normal-width grotesk carries everything Latin, tightened on large sizes until headlines read as solid blocks; Tamil is set in a proper Tamil face at full size and weight, never as decoration.

### Hierarchy
- **Display** (600, clamp 2.6rem to 5.4rem, 1.05, -0.035em): The hero H1 and final call to action (clamp 2.4rem to 4.6rem), balanced, max ~13 to 15ch.
- **Headline** (600, clamp 2rem to 3.5rem, 1.05, -0.035em): Section H2s, max 18ch, left aligned in content sections. App page titles use clamp 2.2rem to 3.2rem.
- **Title** (600, 1.3rem, 1.25, -0.02em): H3s, plan names, export headings; story step titles enlarge to clamp 1.6rem to 2.1rem.
- **Lede** (400, clamp 1.1rem to 1.3rem, 1.5): One-sentence subcopy under headlines, ink-secondary, max 44ch.
- **Body** (400, 17px, 1.55): Paragraphs at max 66ch with pretty wrapping.
- **Label** (500, 0.9rem): Form labels, notes, nav links (0.92rem), buttons (1rem at 500).
- **Tamil specimen** (600, clamp 2rem to 4.2rem, 1.25, -0.01em): The large Tamil dialogue line on the landing page; Tamil keeps a looser line height than Latin display.
- **Timecode** (Geist Mono, 11 to 12px, tabular figures): SRT/VTT timestamps, file extensions, timeline lane labels.

### Named Rules
**The Normal-Width Rule.** Display type is Geist at normal width, weight 600, tracked tight. No condensed, compressed or novelty display faces anywhere.

**The Mono Is for Time Rule.** Geist Mono appears only where the content is machine time or a file format (timecodes, .srt/.vtt, lane labels). It is never used for headings, labels or decoration.

## Layout

Content sits in a centered column of min(1120px, 100% minus 40px); the hero product shot breaks wider to min(1200px, 100% minus 40px). Persuade sections use 140px vertical padding (96px under 900px), with 64px to 80px gaps between two-column halves. The hero is centered: H1, lede, a row of primary pill plus arrow text link, and a short muted note, with the product shot directly below bleeding past the fold.

Two-column compositions are asymmetric (roughly 1 : 1.15 for story, 0.85 : 1.25 for the plugin section, 1 : 2 for FAQ) and collapse to one column under 900px. Facts and formats use top-hairline definition lists in three and two columns. Pricing is a single bordered table of four columns (two under 900px, one under 560px), not four floating cards.

Operate surfaces use a sticky translucent header, a 24px stack gap between panels, a 180px sticky side nav in admin (horizontal scroller under 900px), and an editor grid of 1.15 : 1 with a sticky video viewer that unsticks under 960px.

## Elevation & Depth

A hybrid: light surfaces are nearly flat and rely on hairlines and tonal steps (ground, ground-alt, surface); depth is reserved for the product. Panels carry only a whisper shadow, the auth card a soft ambient one, and the dark device shots a heavy, diffuse product shadow plus a 1px near-black ring and a faint inner top highlight. 3D is real perspective on the device, not shadow tricks: the hero tilts back 22 degrees and straightens as you scroll; the Premiere window is turned about 10 degrees and eases toward flat on hover.

### Shadow Vocabulary
- **Whisper** (`box-shadow: 0 1px 2px rgba(0,0,0,.05), 0 1px 1px rgba(0,0,0,.03)`): Panels, the plans table, active segmented-control button, active admin nav item.
- **Ambient** (`box-shadow: 0 2px 6px rgba(0,0,0,.04), 0 12px 32px -12px rgba(0,0,0,.12)`): The floating auth card.
- **Product** (`box-shadow: 0 0 0 1px rgba(0,0,0,.9), 0 30px 60px -20px rgba(0,0,0,.35), 0 18px 36px -18px rgba(0,0,0,.3)`): Dark device shots only (hero editor, story panel, Premiere window).
- **Focus halo** (`box-shadow: 0 0 0 4px rgba(21,87,255,.15)`): Focused fields; a 3px version at .12 marks the active cue and the picked plan.

### Named Rules
**The Product Casts the Shadow Rule.** Only device surfaces get the heavy product shadow and perspective. Light UI stays flat with hairlines and a whisper shadow at most.

## Shapes

Soft, consistent geometry. Every button and nav link is a full pill (999px). Fields, rows, notices and small controls use 10px; panels, stats, the upload zone, the video player and the plans table use 20px; device windows use 16px to 20px (18px for the hero). Inner details inside devices (chips, clips, code, segmented buttons, the logo tile) use 6px. Borders are 1px hairlines; the upload zone alone uses a 1.5px dashed border. Status dots and step numbers are circles.

## Components

### Buttons
Confident and quiet: solid blue pills that press slightly.
- **Shape:** Full pill (999px).
- **Primary:** Signal Blue fill, white 1rem/500 text, -0.01em tracking, 0.85em by 1.35em padding.
- **Hover / Focus / Active:** Background deepens to Pressed Blue; active scales to 0.98; focus shows a 2px Signal Blue outline at 2px offset.
- **Ghost:** Transparent with an inset 1px hairline ring and ink text; hover fills Ground Alt. Used for secondary plan choices and "Get the plugin".
- **Small:** 0.6em by 1em at 0.9rem, used in headers.
- **Danger:** Transparent with red text and a 35% red inset ring; hover adds a 6% red wash.
- **Disabled:** Hairline Soft fill, muted text, no transform.
- **Text link with arrow:** Blue 500 text with an inline SVG chevron that slides 3px on hover; the secondary action beside a primary pill.

### Cards / Containers
- **Corner Style:** 20px.
- **Background:** Surface on a Ground or Ground Alt page.
- **Shadow Strategy:** Whisper (see Elevation).
- **Border:** 1px Hairline Soft (panels) or Hairline (job rows, stats, cues).
- **Internal Padding:** 24px panels, 18px by 20px stats, 14px by 18px job rows.
- **Hover:** Job rows nudge 4px right; stats lift 2px. Selected cards (picked plan, active cue) take a blue border plus a 3px blue halo.

### Inputs / Fields
- **Style:** Surface fill, 1px Hairline border, 10px radius, 0.7em by 0.85em padding, inherited 17px type. Selects use a custom SVG chevron.
- **Focus:** Border turns Signal Blue with a 4px 15% blue halo; no outline.
- **Error:** Red 0.92rem message text below the field.
- **Timecode fields:** Geist Mono 0.82rem with tabular figures, 124px wide.

### Navigation
- **Header:** 60px row, logo left (ink tile with a yellow-and-white subtitle stroke, 600 weight wordmark), links right. Sticky with an 82 to 85% Ground backdrop, saturate-and-blur, and a 6% black bottom hairline.
- **Links:** Ink Secondary 0.92rem pills; hover and current page fill Ground Alt with ink text. The primary action is a small blue pill. Section links hide under 900px.
- **App:** Same header with nav centered; sign out is a quiet muted text button, not a pill. Wraps nav to its own row under 720px.
- **Admin side nav:** 180px sticky list of 10px-radius links; current item is Surface with a whisper shadow and hairline ring.

### Segmented Control
A 3px-padded Hairline Soft track with 10px radius holding 8px-radius buttons; the pressed option becomes Surface with a whisper shadow. Used for Tamil / English / Both switching.

### Device Window (signature)
The product rendered as a dark window: Device body, 44px Device Raised title bar with three muted dots and centered muted title, Device Line dividers, Product shadow and 1px near-black ring. Inside: video pane with on-screen subtitles, bilingual cue list (mono timecode, Tamil in Device Ink, English in Device Muted; the active cue turns its Tamil line yellow with a 40% yellow inset ring), and a timeline strip with caption clips and a Device Blue playhead. The same shell is reused for the "How it works" story panel and the Premiere Pro window.

### On-Screen Subtitle
600-weight centered text, Subtitle Yellow for Tamil and white 500 for English at 0.82em, line height 1.3, with a hard dark text-shadow (`0 1px 2px rgba(0,0,0,.9), 0 0 1px #000`). Lines fade and rise 6px into place, English 80ms after Tamil.

### Motion
One easing for everything: `cubic-bezier(.22, 1, .36, 1)`. Content rises 18 to 24px with opacity over 0.7 to 0.9s, staggered 60 to 80ms. The hero device straightens from 22 degrees and scale 0.94 to flat over the first 70% of a viewport of scroll. "How it works" pins the device panel while four steps scroll past at 30% opacity until active. All motion is removed under reduced-motion, and content is visible without JavaScript.

### Adobe Panel
The CEP panel is a compact dark version of the same world: Device Raised background, Geist 13px, Device Well chips, 8px fields, blue pill actions, Device Blue links and meter, and the same logo mark.

## Do's and Don'ts

### Do:
- **Do** keep the page light (ground, ground-alt) and show the product as a dark device on it.
- **Do** use Signal Blue (#1557ff) only for actions, links, focus and selection; one primary blue pill per decision.
- **Do** set display type in Geist 600 at normal width with -0.035em tracking and balanced wrapping.
- **Do** set every Tamil string with `lang="ta"` in Noto Sans Tamil, at full size beside its English.
- **Do** reserve Geist Mono and tabular figures for timecodes and file formats.
- **Do** use pills for buttons and nav, 10px for fields and rows, 20px for panels.
- **Do** keep light UI flat with hairlines and the whisper shadow; give the product shadow and perspective only to device shots.
- **Do** pair every status colour with a word or dot-plus-word.
- **Do** use the single ease `cubic-bezier(.22, 1, .36, 1)` and honour reduced motion.

### Don't:
- **Don't** bring back the glassy violet, aurora or gradient-text dark UI; it was rejected as AI-generated.
- **Don't** bring back the themed "release-night banner street" world: no enamel boards, bamboo, floodlights, themed costumes, or green/yellow-on-black.
- **Don't** use condensed or compressed display type anywhere.
- **Don't** use gradient text, glow effects or frosted-glass panels; the only translucency is the sticky header's backdrop blur.
- **Don't** use Subtitle Yellow on the light page outside the logo mark; it belongs inside the device.
- **Don't** introduce a second accent colour on light surfaces.
- **Don't** put a label, kicker or eyebrow above headlines; headlines stand alone.
