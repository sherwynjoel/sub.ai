"use client";

/**
 * A holographic card: it tilts towards the pointer, catches a crushed-glass foil and flips over when clicked, tapped or on Enter.
 * Left alone it sways a little, so the foil moves on a phone too. The foil reads --mx/--my (pointer, %) and
 * --holo (0..1). Mechanics after Aakash Mehra's Holographic Business Card.
 */

import { motion, useAnimationFrame, useMotionValue, useReducedMotion, useSpring, useTransform, type MotionValue } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type ReactNode } from "react";

const spot = "radial-gradient(farthest-corner circle at var(--mx) var(--my), #000 0%, rgba(0,0,0,.4) 55%, transparent 100%)";

// Crushed glass: a pastel band moving with the pointer, differenced against flat grey cells, so each facet takes its
// own tint and brightens or dims as the light moves; then lifted towards white.
const shards: CSSProperties = {
  backgroundImage:
    "linear-gradient(#5a5a5a, #5a5a5a)," +
    "repeating-linear-gradient(125deg, hsl(185 100% 80%) 0%, hsl(150 90% 80%) 5%, hsl(270 100% 85%) 10%, hsl(330 100% 85%) 15%, hsl(55 100% 82%) 20%, hsl(185 100% 80%) 25%)," +
    "url(/pass-shards.webp)",
  backgroundBlendMode: "screen, difference, normal",
  backgroundSize: "auto, 300% 300%, 100% 100%",
  backgroundPosition: "0 0, var(--mx) var(--my), 0 0",
};

const MAX_TILT = 16; // degrees
const HOVER_SCALE = 1.03;
const IDLE_GLOW = 0.6; // the foil's level when nobody is touching the card
const FOIL_STRENGTH = 0.7;

function Face({ back, opacity, children }: { back?: boolean; opacity: MotionValue<number>; children: ReactNode }) {
  return (
    <motion.span className="holo-face" style={{ transform: back ? "rotateY(180deg)" : "translateZ(0)", opacity }}>
      {children}
      <span aria-hidden className="holo-foil" style={{ opacity: `calc(var(--holo) * ${FOIL_STRENGTH})`, WebkitMaskImage: spot, maskImage: spot }}>
        <span style={shards} />
      </span>
      <span aria-hidden className="holo-glare" />
    </motion.span>
  );
}

export default function HolographicCard({ label, front, back }: { label: string; front: ReactNode; back: ReactNode }) {
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
          <Face opacity={frontOpacity}>{front}</Face>
          <Face back opacity={backOpacity}>{back}</Face>
        </motion.span>
      </motion.button>
    </div>
  );
}
