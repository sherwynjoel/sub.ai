---
name: Vasanam
description: Tamil and English subtitles, painted on enamel boards on a floodlit release-night street.
colors:
  chrome-yellow: "#ffd21f"
  chrome-yellow-lit: "#ffdc4d"
  enamel-green: "#0c6a3c"
  enamel-green-deep: "#08502d"
  enamel-green-lit: "#4cc787"
  enamel-white: "#f3f1e8"
  vermilion: "#ff6b57"
  bamboo: "#a8844a"
  bamboo-dark: "#6d5430"
  flood: "#ffe9b4"
  night: "#0b0c0a"
  night-board: "#121410"
  night-well: "#1b1e17"
  screen-black: "#050604"
  ink-soft: "#c9cbbf"
  ink-muted: "#a7ab9c"
typography:
  display:
    fontFamily: "Anek Tamil, system-ui, sans-serif"
    fontSize: "clamp(2.8rem, 6.2vw, 5.6rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  headline:
    fontFamily: "Anek Tamil, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4.4vw, 3.8rem)"
    fontWeight: 800
    lineHeight: 0.98
    letterSpacing: "-0.01em"
    fontVariation: "'wdth' 75"
  title:
    fontFamily: "Anek Tamil, system-ui, sans-serif"
    fontSize: "1.6rem"
    fontWeight: 800
    lineHeight: 0.98
    fontVariation: "'wdth' 75"
  body:
    fontFamily: "Anek Tamil, system-ui, sans-serif"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: 1.6
    fontVariation: "'wdth' 100"
  label:
    fontFamily: "Anek Tamil, system-ui, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    letterSpacing: "0.04em"
    fontVariation: "'wdth' 85"
  plaque:
    fontFamily: "Anek Tamil, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 800
    lineHeight: 1
    letterSpacing: "0.01em"
    fontVariation: "'wdth' 85"
rounded:
  sm: "4px"
  lg: "6px"
spacing:
  gutter: "16px"
  panel: "24px"
  board: "46px"
  section: "128px"
components:
  button-primary:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.night}"
    typography: "{typography.plaque}"
    rounded: "{rounded.sm}"
    padding: "0.95em 1.4em"
  button-primary-hover:
    backgroundColor: "{colors.chrome-yellow-lit}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.sm}"
    padding: "0.95em 1.4em"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.vermilion}"
    rounded: "{rounded.sm}"
  input:
    backgroundColor: "{colors.night-well}"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.sm}"
    padding: "0.72em 0.85em"
  board:
    backgroundColor: "{colors.enamel-green}"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.board}"
  panel:
    backgroundColor: "{colors.night-board}"
    textColor: "{colors.enamel-white}"
    rounded: "{rounded.lg}"
    padding: "{spacing.panel}"
  ticket:
    backgroundColor: "{colors.enamel-white}"
    textColor: "{colors.night}"
    rounded: "{rounded.lg}"
  ticket-featured:
    backgroundColor: "{colors.chrome-yellow}"
    textColor: "{colors.night}"
---

# Design System: Vasanam

## Overview

**Creative North Star: "Release-Night Banner Street"**

The product is a floodlit Kollywood banner street at night. The ground is near-black; the things that speak are opaque enamel signboards in Tamil Nadu signboard green, lettered by a sign-writer in enamel white and chrome yellow, bolted into a painted frame and standing on bamboo scaffolding. One warm floodlight temperature lights everything. Tamil and English share the same board, the same lettering family, and the same timing, the way they share a subtitle track.

Persuade surfaces (landing, auth) are the street itself: boards on scaffolds, lamps above them, boards that hoist into place on a top hinge. Operate surfaces (app, editor, admin) step off the street into the workshop: dark night boards (panels) carry the work, and the green enamel and yellow plaques appear only where an action or the current place needs announcing. The user rejected the previous glassy violet, aurora, gradient-text look as AI-generated; this world replaces it with paint, metal and wood.

**Key Characteristics:**
- Night ground, opaque green enamel boards, white and chrome-yellow lettering.
- One family (Anek Tamil) for both scripts; its width axis separates painted lettering (condensed) from reading text (normal).
- Every board is framed, bolted and closed by a label strip.
- One warm floodlight; no colored light, no glow, no glass.
- Motion is physical: boards hoist on a hinge, subtitle lines paint on left to right, lamps flicker on once.

## Colors

A night street lit by one warm lamp: near-black ground, one enamel green, two lettering paints, and wood.

### Primary
- **Chrome Yellow** (chrome-yellow): The plaque paint and the subtitle paint. Primary buttons, Tamil subtitle lines, timecode addresses, the active cue, meters, selection, caret and focus ring. Its lit step (chrome-yellow-lit) is the plaque hover only.

### Secondary
- **Signboard Green** (enamel-green): The board field. Offer, step, rate, demo, plugin, final and auth boards; the admin nav's current item; the logo plate; scrollbar thumb. White lettering on it reads at 5.9:1.
- **Frame Green** (enamel-green-deep): The painted frame inset inside every green board and plate.
- **Lit Green** (enamel-green-lit): Green as text on night: success status, completed jobs.

### Tertiary
- **Bamboo** and **Bamboo Knot** (bamboo, bamboo-dark): Scaffold poles and lashings under boards. Never used for text or controls.
- **Floodlight** (flood, used as `rgba(255, 233, 180, alpha)` at .16 to .55): The lamp lip and the light cone. The only light in the world.
- **Vermilion** (vermilion): Errors and destructive actions only.

### Neutral
- **Night** (night): Page ground and header.
- **Night Board** (night-board): Panels, the notice board, interval band, ground strip, dropdown options.
- **Night Well** (night-well): Inputs, code, meter tracks.
- **Screen Black** (screen-black): The face of a screen board, where a clip plays.
- **Enamel White** (enamel-white): Primary lettering and ink; also the pricing ticket stock.
- **Soft Ink** (ink-soft) and **Muted Ink** (ink-muted): Secondary text and labels (muted reads 8.3:1 on night).
- Hairlines are enamel white at 12% (rest) and 26% (emphasis) alpha.

### Named Rules
**The Two-Paint Rule.** A board carries at most two lettering paints: enamel white and chrome yellow. Green lettering lives on night, never on a green board.

**The One Floodlight Rule.** All light is the warm flood color at low alpha, cast downward from a lamp. No colored light, no glow halos, no neon.

**The Vermilion Is Trouble Rule.** Vermilion means error or destruction. It never decorates.

## Typography

**Display Font:** Anek Tamil (with system-ui, sans-serif), loaded through next/font with the `wdth` axis, Latin and Tamil subsets.
**Body Font:** Anek Tamil at normal width.

**Character:** A single family carries both scripts, so a Tamil line and its English twin look painted by the same hand. Width is the voice switch: condensed extra-bold is sign-writer lettering, normal width is reading text.

### Hierarchy
- **Display** (800, clamp(2.8rem, 6.2vw, 5.6rem), 0.98, width 75%): Page H1 and the hero board's biggest phrase.
- **Headline** (800, clamp(2.1rem, 4.4vw, 3.8rem), 0.98, width 75%): Section titles on the street; app page titles step down to clamp(2.2rem, 4vw, 3.2rem).
- **Title** (800, 1.6rem, width 75%): Board and panel headings; step-board titles scale up to clamp(3rem, 5.2vw, 4.6rem) because they are the board's biggest word.
- **Body** (400, 17px, 1.6, width 100%): Running text, max 66ch.
- **Label** (700, 0.78rem, +0.04em, width 85%): Label strips and timecode addresses. Sentence case, never uppercase.
- **Plaque** (800, 1rem, width 85%): Button lettering.
- **Numerals** (800, width 75%, 2.1rem to 3rem): Prices and admin stats; tabular figures wherever time or counts align.

### Named Rules
**The Width-Is-Voice Rule.** 75% width is painted lettering, 85% is plaques and strips, 100% is reading. Never set a paragraph condensed or a headline at normal width.

**The One Biggest Word Rule.** Each board paints one phrase biggest. When a heading has a lead-in, the lead-in is set at half size on its own line inside the same heading element.

**The Subtitle Lettering Rule.** Subtitle lines are centered, 800 condensed yellow for Tamil over 600 normal-width white for English, with a hard black text shadow (`0 2px 0 #000, 0 0 2px #000`) as on a burned-in subtitle. That shadow belongs to subtitle lettering only.

## Layout

Content sits in a centered wrap of min(1200px, 100% minus 32px). Street sections breathe at 128px vertical padding (96px under 980px); boards stagger in height (step boards offset 0 / 56px / 20px) so the street does not read as a grid of cards. The hero is a two-column rig (1fr / 1.12fr, 64px gap) seen in perspective; boards turn a few degrees toward the viewer and scrolling dollies the camera. Under 980px the rig flattens to one column with no rotation and scaffolds shorten; under 600px board padding drops to about 24px and multi-column sets go single.

Operate surfaces are denser: 36px top padding, 24px gaps between panels, panels padded 24px; the admin shell uses a 180px sticky side nav. Section anchors on the landing page are timecode addresses (00:12, 00:31, 00:48, 01:05) that appear both in the header nav and before the matching section heading, so navigation reads like jumping to a timecode.

## Elevation & Depth

Depth is physical, not atmospheric. Boards are opaque paint with a soft, low drop shadow beneath them and inset rings that draw the painted frame; panels get the same drop shadow plus a 1px top highlight. There is no glass, no backdrop blur, no glow. Distance on the street is real 3D (perspective, rotateY, translateZ), and light comes only from the floodlight cone.

### Shadow Vocabulary
- **Board drop** (`0 22px 40px -22px rgba(0,0,0,.85), 0 2px 6px rgba(0,0,0,.35)`): Under every board and panel.
- **Painted frame** (`inset 0 0 0 7px <frame>, inset 0 0 0 8px rgba(243,241,232,.18)`): The frame ring on boards; frame green on green boards, green on screen boards, #1f231b on the notice board.
- **Plaque rim** (`inset 0 0 0 2px rgba(11,12,10,.55), inset 0 0 0 4px <plaque>, inset 0 0 0 5px rgba(11,12,10,.25), 0 10px 18px -10px rgba(0,0,0,.9)`): The double rim and short drop of a yellow plaque.
- **Focus wash** (`0 0 0 3px rgba(255,210,31,.2)`): Input focus, with a yellow border.

### Named Rules
**The Opaque Enamel Rule.** Board faces are one solid paint. Gradients appear only where the world draws a physical thing: the lamp lip, the light cone, bamboo poles and lashings, ticket notches.

## Shapes

Corners are barely softened, like cut sheet metal: 4px for plaques, inputs, chips and list rows; 6px for boards, panels, screens and tickets; 3px for code, focus outlines and cue rows. Boards carry two round bolts 16px in from the top corners. Pricing tickets are notched with two 11px semicircles where the stub tears off, with a dashed tear line. Status uses a dot plus a word, never color alone.

## Components

### Buttons
Enamel plaques: flat paint, a painted double rim, a short drop.
- **Shape:** Slightly softened plaque (4px).
- **Primary:** Chrome yellow with night lettering, plaque type, padding 0.95em 1.4em; small variant 0.62em 1em at 0.9rem.
- **Hover / Active:** Lifts 2px, lightens to chrome-yellow-lit, drop lengthens; presses 1px down on active. Ease `cubic-bezier(.16,1,.3,1)`, 0.2s.
- **Ghost:** Transparent with a 1.5px enamel-white hairline ring (26%); ring goes full white on hover.
- **Danger:** Transparent with a vermilion ring and vermilion lettering.
- **Disabled:** Transparent, muted lettering, hairline ring, no lift.
- **On a featured (yellow) ticket:** inverts to a night plaque with yellow lettering.

### Chips (segmented toggle)
- **Style:** A row of buttons in one 4px frame divided by 1.5px rules; soft-ink lettering.
- **State:** The pressed segment is painted chrome yellow with night lettering.

### Cards / Containers
- **Board (green):** Signboard green, 6px corners, painted frame ring, two bolts, board drop. Padding about 46px on the street, 24px on small screens. Ends in a label strip. Hoists into place.
- **Panel (night board):** Night board fill, 1px hairline, 6px corners, board drop, 24px padding. The container of every Operate page.
- **Screen board:** Night board framed in green, screen-black face at 16:9 where the clip and its subtitle play; waveform and timecode in the strip.
- **Ticket:** Enamel white (featured: chrome yellow) stock with notches and a dashed stub holding the plaque.

### Inputs / Fields
- **Style:** Night well fill, 1px enamel hairline (26%), 4px corners, padding 0.72em 0.85em; labels 600 at 0.92rem in soft ink above the field. Selects carry a yellow chevron.
- **Focus:** Border turns chrome yellow with the 3px yellow focus wash. Caret is yellow.
- **Error:** Vermilion text; on a green board the error sits on a night chip so it stays legible.
- **On a green board:** fields switch to a night fill.

### Navigation
- **Street header:** Sticky, night fill, hairline bottom. Logo is a small green plate with a yellow underline stroke beside the condensed wordmark. Links in soft ink, 600, with a 7% white wash on hover and for the current page; each landing link is prefixed by its yellow timecode address. The trailing action is a small yellow plaque. Address links hide under 980px.
- **Admin side nav:** Soft-ink links; the current item becomes a green enamel plate with a frame-green inset.

### Label Strip (signature)
The small painted strip at the foot of every board: a 1.5px rule in the board's lettering color, then short items divided by vertical 1.5px rules, label type at 90% opacity. It carries plain facts (No card needed, Tamil + English, versions, a live timecode), never slogans.

### Subtitle Paint-On (signature)
Subtitle lines reveal left to right with a clip-path wipe (0.95s, English delayed 0.32s), as if brushed on. The active cue in the waveform and cue lists is marked in chrome yellow.

### Hoist and Floodlight (signature motion)
Boards swing down on a top hinge as they enter (rotate X from about -62deg, 1.1s, staggered 0.12s). Once a board lands, its lamp flickers on once and stays lit. Operate pages use a quieter 18px rise. All of it is removed under reduced motion, with lamps left on.

## Do's and Don'ts

### Do:
- **Do** put Operate work on night-board panels and reserve green enamel for boards that announce (hero, auth, steps, current admin nav item).
- **Do** close every board with a label strip of plain facts.
- **Do** keep Tamil and English together and at the same timing; Tamil leads in yellow, English follows in white.
- **Do** use condensed 800 lettering (width 75%) for headings and numerals and normal width for reading text.
- **Do** mark the current item, active cue and focus in chrome yellow.
- **Do** pair status color with a dot and a word.
- **Do** honor reduced motion: no hoist, no paint-on, lamps on.

### Don't:
- **Don't** paint gradients, glass, backdrop blur or glow on boards or lettering; the floodlight cone and bamboo drawing are the only gradients.
- **Don't** add a third lettering paint to a board, or letter green on green.
- **Don't** use vermilion for anything but errors and destructive actions.
- **Don't** introduce colored or cool light; every light is the warm flood.
- **Don't** set uppercase tracked labels above headings; addresses are timecodes that also navigate, and the strip lives at the foot of a board.
- **Don't** round boards, panels, plaques or fields past 6px; only physical fixtures (bolts, lamp housings) curve further.
