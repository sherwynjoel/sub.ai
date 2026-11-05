"use client";

/**
 * A holographic card: it tilts towards the pointer, catches a foil and flips over when clicked, tapped or on Enter.
 * Left alone it sways a little, so the foil moves on a phone too. Each foil reads --mx/--my (pointer, %), --px/--py
 * (pointer, 0..1) and --holo (0..1). Mechanics after Aakash Mehra's Holographic Business Card.
 */

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

export type Foil = "shards" | "gold" | "cosmos";

const spot = "radial-gradient(farthest-corner circle at var(--mx) var(--my), #000 0%, rgba(0,0,0,.4) 55%, transparent 100%)";

/** `k` scales the foil's strength; `spot` confines it to the pool of light around the pointer. */
const FOILS: Record<Foil, { k: number; spot: boolean; layer: CSSProperties }> = {
  shards: {
    k: 1,
    spot: true,
    layer: {
      // Crushed glass: a pastel band moving with the pointer, differenced against flat grey cells, so each facet takes
      // its own tint and brightens or dims as the light moves.
      backgroundImage:
        "linear-gradient(#5a5a5a, #5a5a5a)," +
        "repeating-linear-gradient(125deg, hsl(185 100% 80%) 0%, hsl(150 90% 80%) 5%, hsl(270 100% 85%) 10%, hsl(330 100% 85%) 15%, hsl(55 100% 82%) 20%, hsl(185 100% 80%) 25%)," +
        "url(/pass-shards.webp)",
      backgroundBlendMode: "screen, difference, normal",
      backgroundSize: "auto, 300% 300%, 100% 100%",
      backgroundPosition: "0 0, var(--mx) var(--my), 0 0",
    },
  },
  gold: {
    k: 0.7,
    spot: false,
    layer: {
      backgroundImage:
        "linear-gradient(115deg, transparent 30%, rgba(255,214,120,.45) 41%, rgba(255,248,225,.95) 48%, rgba(255,232,160,.85) 51%, rgba(196,140,40,.5) 58%, transparent 70%), linear-gradient(rgba(214,168,72,.14), rgba(214,168,72,.14))",
      backgroundSize: "250% 250%, auto",
      backgroundPosition: "var(--mx) var(--my), 0 0",
    },
  },
  cosmos: {
    k: 0.9,
    spot: false,
    layer: {
      // Star points over a drifting nebula.
      backgroundImage:
        "radial-gradient(circle, #fff 0 .7px, transparent 1.2px), radial-gradient(circle, #fff 0 .5px, transparent 1px), radial-gradient(circle, #fff 0 1px, transparent 1.6px)," +
        "radial-gradient(ellipse 45% 55% at calc(20% + var(--px) * 25%) calc(30% + var(--py) * 20%), hsl(275 90% 65% / .75), transparent 70%)," +
        "radial-gradient(ellipse 40% 50% at calc(80% - var(--px) * 30%) calc(70% - var(--py) * 25%), hsl(320 95% 66% / .65), transparent 70%)," +
        "radial-gradient(ellipse 35% 45% at calc(55% + var(--px) * 10%) calc(20% + var(--py) * 40%), hsl(180 90% 58% / .55), transparent 70%)",
      backgroundSize: "47px 59px, 31px 37px, 89px 71px, auto, auto, auto",
      backgroundPosition: "0 0, 13px 21px, 37px 11px, 0 0, 0 0, 0 0",
    },
  },
};

const MAX_TILT = 16; // degrees
const HOVER_SCALE = 1.03;
const IDLE_GLOW = 0.7; // the foil's level when nobody is touching the card

function Face({ back, foil, opacity, children }: { back?: boolean; foil: Foil; opacity: MotionValue<number>; children: ReactNode }) {
  const f = FOILS[foil];
  return (
    <motion.span className="holo-face" style={{ transform: back ? "rotateY(180deg)" : "translateZ(0)", opacity }}>
      <span aria-hidden className="holo-foil" style={{ opacity: `calc(var(--holo) * ${f.k})`, ...(f.spot && { WebkitMaskImage: spot, maskImage: spot }) }}>
        <span style={f.layer} />
      </span>
      {children}
      <span aria-hidden className="holo-glare" />
    </motion.span>
  );
}

export default function HolographicCard({ foil, label, front, back }: { foil: Foil; label: string; front: ReactNode; back: ReactNode }) {
  const still = useReducedMotion();
  const held = useRef(false);

  // Where the pointer is over the card, 0..1.
  const px = useMotionValue(0.5);
  const py = useMotionValue(0.5);
  const spring = { stiffness: 180, damping: 18, mass: 0.6 };
  const sx = useSpring(px, spring);
  const sy = useSpring(py, spring);
  const holo = useSpring(IDLE_GLOW, { stiffness: 120, damping: 20 });
  const scale = useSpring(1, spring);

  const rotateY = useTransform(sx, [0, 1], [-MAX_TILT, MAX_TILT]);
  const rotateX = useTransform(sy, [0, 1], [MAX_TILT, -MAX_TILT]);
  const mx = useTransform(sx, (v) => `${v * 100}%`);
  const my = useTransform(sy, (v) => `${v * 100}%`);

  // The card spins in and lands on its front. Faces swap at the edge too: not every WebKit honours backface-visibility.
  const flip = useSpring(still ? 0 : -720, { stiffness: 42, damping: 13 });
  const facing = (a: number) => { const n = ((a % 360) + 360) % 360; return n < 90 || n > 270; };
  const frontOpacity = useTransform(flip, (a): number => (facing(a) ? 1 : 0));
  const backOpacity = useTransform(flip, (a): number => (facing(a) ? 0 : 1));
  const [flipped, setFlipped] = useState(false);
  useEffect(() => flip.set(0), [flip]);

  useAnimationFrame((t) => {
    if (still || held.current) return;
    px.set(0.5 + 0.3 * Math.sin(t / 1500));
    py.set(0.5 + 0.22 * Math.cos(t / 1900));
  });

  const toggle = () => {
    const next = flipped ? 0 : 180;
    if (still) flip.jump(next);
    else flip.set(next);
    setFlipped(!flipped);
  };

  // Tracked on the untransformed wrapper: the tilted card's edges move out from under the pointer.
  const track = (e: PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    held.current = true;
    px.set(Math.min(1, Math.max(0, (e.clientX - r.left) / r.width)));
    py.set(Math.min(1, Math.max(0, (e.clientY - r.top) / r.height)));
    holo.set(1);
    scale.set(HOVER_SCALE);
  };
  const reset = () => {
    held.current = false;
    holo.set(IDLE_GLOW);
    scale.set(1);
  };

  return (
    <div className="holo" onPointerDown={track} onPointerMove={track} onPointerLeave={reset} onPointerCancel={reset}>
      <motion.button
        type="button"
        aria-label={`${label} ${flipped ? "Showing the back; flip to the front." : "Flip the card."}`}
        onClick={toggle}
        className="holo-card"
        style={{
          rotateX: still ? 0 : rotateX,
          rotateY: still ? 0 : rotateY,
          scale: still ? 1 : scale,
          "--px": sx,
          "--py": sy,
          "--mx": mx,
          "--my": my,
          "--holo": holo,
        } as never}
      >
        <motion.span className="holo-spin" style={{ rotateY: flip }}>
          <Face foil={foil} opacity={frontOpacity}>{front}</Face>
          <Face back foil={foil} opacity={backOpacity}>{back}</Face>
        </motion.span>
      </motion.button>
    </div>
  );
}
