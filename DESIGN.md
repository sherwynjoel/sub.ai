# Vasanam — Liquid Glass design system

Frosted, glossy panels float over soft pastel colour that drifts behind the page. Gen Z, bright, clean.
Source of truth for tokens: `app/globals.css`. Landing: `components/Landing.tsx` + `app/landing.css`.

## Colour
| Token | Value | Use |
|---|---|---|
| `--bg` | `#f4f3fb` | Page base under the colour drift |
| `--lilac` `--sky` `--mint` `--peach` | `#c9b8ff` `#9fd8ff` `#a8f0d0` `#ffc9a8` | Blurred blobs behind the glass only (`body::before`) |
| `--black` / `--ink` / `--primary` | `#0c0c14` | Text, primary pill buttons, dark product windows |
| `--lime` | `#d4ff3f` | Highlighter (`.mark`), "Live" chips, accents on dark glass. Always with black text |
| `--ink-2` / `--muted` | `#2e2e3d` / `#555566` | Secondary and supporting text |
| `--ok` `--bad` `--warn` | `#157a3c` `#c0262d` `#9a5b00` | Status, always paired with a word and a shape |

## Glass
`--glass` (white 48%) + `--blur` (blur 22px, saturate 170%) + 1px white edge + `--glass-shadow`
(inner top highlight, inner bottom sheen, soft violet drop). Applied to `.glass` and to every app/admin surface
(`.panel`, `.stat`, `.job`, `.drop`, `.plan`, `.cues li`, `.admin-nav`, headers). Dark glass (`rgba(14,14,24,.82)`) is used
for product windows, the featured plan and the closing band. Without backdrop-filter support the glass turns near-opaque white.

## Type
Bricolage Grotesque 700 for headings (`--font-display`), Instrument Sans for body (`--font-sans`), Noto Sans Tamil for
`[lang="ta"]`, Nirmala UI fallback for other Indian scripts. h1 `clamp(2.7rem, 6.4vw, 5.4rem)`; Tamil headings get line-height 1.25.

## Shape
Radii 12 / 24px; nav, headers, buttons, chips and status are pills.

## Motion
- Colour drift behind the page (28s).
- `.rise` reveal on scroll; `[data-scroll]` gives `--p` 0→1 (hero editor straightens from `rotateX(24deg)`, steps bar fills).
- `.shine` glass gets a light spot under the cursor; `.tilt` (Premiere window) also leans toward it.
- Greeting chip cycles through Indian languages; language strip scrolls and pauses on hover; glass cube turns.
- `prefers-reduced-motion` stops all of it.

## Multilingual
The site is English, with Indian scripts where they show the product: dialogue samples, the hero editor, the greeting chip,
and the language strip (all 22 languages from `lib/languages.ts`, each marked Live). No site-wide translation or toggle.
