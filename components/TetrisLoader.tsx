"use client";
/**
 * A loading indicator that plays tetris: a bot stacks pieces, clears lines and eventually tops out, then a new
 * game starts. Shown while a video uploads. Adapted from 21st.dev's loader-tetris: the same game, with the
 * Tailwind classes (`grid w-fit`, `bg-foreground/10`) replaced by `.tetris` styles in app/app/app.css.
 */
import { type CSSProperties, useCallback, useEffect, useRef, useState } from "react";

/* ---------- frame generation ---------- */

/** One frame is a flat board, one entry per cell: 0 empty, 1–7 a tetromino, 8 a line clearing, 9 game over. */
export type TetrisFrames = number[][];
type Cell = [number, number];

/** The seven tetrominoes, each rotation listed as [x, y] cells. */
const SHAPES: { id: number; rot: Cell[][] }[] = [
  { id: 1, rot: [[[0, 1], [1, 1], [2, 1], [3, 1]], [[2, 0], [2, 1], [2, 2], [2, 3]]] }, // I
  { id: 2, rot: [[[0, 0], [1, 0], [0, 1], [1, 1]]] }, // O
  { id: 3, rot: [[[1, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [2, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [1, 2]]] }, // T
  { id: 4, rot: [[[1, 0], [2, 0], [0, 1], [1, 1]], [[0, 0], [0, 1], [1, 1], [1, 2]]] }, // S
  { id: 5, rot: [[[0, 0], [1, 0], [1, 1], [2, 1]], [[1, 0], [0, 1], [1, 1], [0, 2]]] }, // Z
  { id: 6, rot: [[[0, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [2, 0], [1, 1], [1, 2]], [[0, 1], [1, 1], [2, 1], [2, 2]], [[1, 0], [1, 1], [0, 2], [1, 2]]] }, // J
  { id: 7, rot: [[[2, 0], [0, 1], [1, 1], [2, 1]], [[1, 0], [1, 1], [1, 2], [2, 2]], [[0, 1], [1, 1], [2, 1], [0, 2]], [[0, 0], [1, 0], [1, 1], [1, 2]]] }, // L
];

/** Every rotation pulled back to the origin, so e.g. the upright I can reach the left wall. */
const PIECES = SHAPES.map(({ id, rot }) => ({
  id,
  rot: rot.map((cells) => {
    const left = Math.min(...cells.map((c) => c[0])), top = Math.min(...cells.map((c) => c[1]));
    return cells.map(([x, y]) => [x - left, y - top] as Cell);
  }),
}));

/** Cells above the ceiling are free; the walls and the floor are not. */
function hits(board: number[], cells: Cell[], ox: number, oy: number, w: number, h: number) {
  for (const [cx, cy] of cells) {
    const x = ox + cx, y = oy + cy;
    if (x < 0 || x >= w || y >= h) return true;
    if (y >= 0 && board[y * w + x]) return true;
  }
  return false;
}

/** Lowest row the piece can reach from `from`. */
function fall(board: number[], cells: Cell[], ox: number, from: number, w: number, h: number) {
  let y = from;
  while (!hits(board, cells, ox, y + 1, w, h)) y++;
  return y;
}

function stamp(board: number[], cells: Cell[], ox: number, oy: number, id: number, w: number) {
  const next = [...board];
  for (const [cx, cy] of cells) {
    const y = oy + cy;
    if (y >= 0) next[y * w + ox + cx] = id;
  }
  return next;
}

function fullRows(board: number[], w: number, h: number) {
  const rows: number[] = [];
  for (let r = 0; r < h; r++) {
    let full = true;
    for (let c = 0; c < w; c++) if (!board[r * w + c]) { full = false; break; }
    if (full) rows.push(r);
  }
  return rows;
}

/** Drops everything above the cleared rows down by as many rows. */
function collapse(board: number[], rows: number[], w: number, h: number) {
  const kept: number[][] = [];
  for (let r = 0; r < h; r++) if (!rows.includes(r)) kept.push(board.slice(r * w, r * w + w));
  const next = new Array<number>((h - kept.length) * w).fill(0);
  for (const row of kept) next.push(...row);
  return next;
}

/** Low stack, few holes, flat surface, cleared lines: the usual four terms. */
function rate(board: number[], lines: number, w: number, h: number) {
  const heights: number[] = [];
  let holes = 0;
  for (let c = 0; c < w; c++) {
    let top = h;
    for (let r = 0; r < h; r++) if (board[r * w + c]) { top = r; break; }
    heights.push(h - top);
    for (let r = top + 1; r < h; r++) if (!board[r * w + c]) holes++;
  }
  let stack = 0, bumps = 0;
  for (let c = 0; c < w; c++) {
    stack += heights[c];
    if (c) bumps += Math.abs(heights[c] - heights[c - 1]);
  }
  return -0.51 * stack + 0.76 * lines - 0.36 * holes - 0.18 * bumps;
}

type Move = { rot: number; x: number; y: number; value: number };

/** Every landing spot for one piece, best first. */
function moves(board: number[], piece: { id: number; rot: Cell[][] }, w: number, h: number) {
  const out: Move[] = [];
  for (let r = 0; r < piece.rot.length; r++) {
    const cells = piece.rot[r], span = Math.max(...cells.map((c) => c[0]));
    for (let x = 0; x + span < w; x++) {
      const y = fall(board, cells, x, -4, w, h);
      const landed = stamp(board, cells, x, y, piece.id, w), lines = fullRows(landed, w, h);
      out.push({ rot: r, x, y, value: rate(collapse(landed, lines, w, h), lines.length, w, h) });
    }
  }
  return out.sort((a, b) => b.value - a.value);
}

/** Seven-bag randomiser, so every piece turns up. */
function bag() {
  const order = [0, 1, 2, 3, 4, 5, 6];
  for (let i = order.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Frames of one whole game, from the first piece to the top out. */
export function generateTetrisFrames(w: number, h: number): TetrisFrames {
  const frames: TetrisFrames = [];
  let board = new Array<number>(w * h).fill(0), queue: number[] = [], placed = 0, alive = true;
  while (alive && placed < 60 && frames.length < 900) {
    if (!queue.length) queue = bag();
    const piece = PIECES[queue.shift()!], spots = moves(board, piece, w, h);
    if (!spots.length) break;
    // The player gets sloppier the longer it survives, so every game ends.
    const slip = Math.max(0, placed - 10) * 0.06;
    const spot = spots[Math.random() < slip ? Math.min(spots.length - 1, 1 + ((Math.random() * 2) | 0)) : 0];
    const shape = piece.rot[spot.rot], tall = Math.max(...shape.map((c) => c[1])) + 1;
    // The piece drifts in from above the ceiling, a row per frame.
    for (let y = -tall; y <= spot.y; y++) if (y + tall > 0) frames.push(stamp(board, shape, spot.x, y, piece.id, w));
    board = stamp(board, shape, spot.x, spot.y, piece.id, w);
    if (shape.some(([, cy]) => spot.y + cy < 0)) alive = false;
    const rows = fullRows(board, w, h);
    if (rows.length) {
      const flash = [...board];
      for (const r of rows) for (let c = 0; c < w; c++) flash[r * w + c] = 8;
      frames.push(flash, [...board], flash);
      board = collapse(board, rows, w, h);
      frames.push([...board], [...board]);
    }
    placed++;
  }
  // Game over: the stack floods the board, then blinks out.
  const flood = [...board];
  for (let r = h - 1; r >= 0; r--) {
    for (let c = 0; c < w; c++) flood[r * w + c] = 9;
    frames.push([...flood]);
  }
  const empty = new Array<number>(w * h).fill(0);
  frames.push([...flood], empty, [...flood], empty, empty);
  return frames;
}

/* ---------- component ---------- */

/** I, O, T, S, Z, J, L: theme variables (app/app/app.css), with the original colours as fallbacks. */
const PALETTE = [
  "var(--tetris-1, oklch(0.609 0.111 221.7))", "var(--tetris-2, oklch(0.666 0.157 58.3))",
  "var(--tetris-3, oklch(0.541 0.247 293))", "var(--tetris-4, oklch(0.627 0.17 149.2))",
  "var(--tetris-5, oklch(0.577 0.215 27.3))", "var(--tetris-6, oklch(0.546 0.215 262.9))",
  "var(--tetris-7, oklch(0.646 0.194 41.1))",
];

type Size = number | string;
const size = (v: Size) => (typeof v === "number" ? `${v}px` : v);

export type TetrisLoaderProps = {
  columns?: number; rows?: number; cellSize?: Size; gap?: Size;
  speed?: number;      // ms per frame
  playing?: boolean; loop?: boolean; label?: string; className?: string;
};

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const q = window.matchMedia("(prefers-reduced-motion: reduce)");
    const read = () => setReduced(q.matches);
    read();
    q.addEventListener("change", read);
    return () => q.removeEventListener("change", read);
  }, []);
  return reduced;
}

export default function TetrisLoader({ columns = 8, rows = 16, cellSize = 6, gap = 2, speed = 40, playing = true, loop = true, label = "Loading", className }: TetrisLoaderProps) {
  const width = Math.max(4, Math.round(columns)), height = Math.max(6, Math.round(rows));
  const gridRef = useRef<HTMLDivElement>(null);
  const frame = useRef(0);
  const reduced = useReducedMotion();
  const [round, setRound] = useState(0);
  // A new game for every round (shown only after a file is picked, so it never renders on the server).
  const [games, setGames] = useState<{ key: string; frames: TetrisFrames } | null>(null);
  const key = `${width}x${height}:${round}`;
  if (games?.key !== key) setGames({ key, frames: generateTetrisFrames(width, height) });
  const game = games?.key === key ? games.frames : null;
  useEffect(() => { frame.current = 0; }, [game]);

  const paint = useCallback((dots: HTMLDivElement[], index: number) => {
    const board = game?.[index];
    if (!board) return;
    dots.forEach((dot, i) => { const v = board[i] ?? 0; dot.style.backgroundColor = v ? `var(--tetris-cell-${v})` : ""; });
  }, [game]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!game || !grid) return;
    const dots = Array.from(grid.children) as HTMLDivElement[];
    if (frame.current >= game.length) frame.current = 0;
    if (reduced) { paint(dots, Math.floor(game.length * 0.55)); return; } // one still board
    paint(dots, frame.current);
    if (!playing) return;
    // A clock, not a timer: a background tab freezes the game instead of rushing through banked frames.
    let request = 0, last = performance.now(), owed = 0;
    const tick = (now: number) => {
      owed += now - last;
      last = now;
      if (owed > speed * 4) owed = speed;
      let ended = false;
      while (owed >= speed) {
        owed -= speed;
        if (++frame.current >= game.length) { ended = true; break; }
      }
      paint(dots, Math.min(frame.current, game.length - 1));
      if (!ended) { request = requestAnimationFrame(tick); return; }
      if (loop) setRound((r) => r + 1); // a new game replaces the frames, which restarts this effect
      else frame.current = game.length - 1;
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [game, playing, speed, loop, paint, reduced]);

  const vars: Record<string, string> = { "--tetris-cell": size(cellSize), "--tetris-gap": size(gap) };
  PALETTE.forEach((c, i) => { vars[`--tetris-cell-${i + 1}`] = c; });
  return (
    <div ref={gridRef} role="status" aria-label={label} aria-busy={playing && !reduced} className={`tetris${className ? ` ${className}` : ""}`}
      style={{ gridTemplateColumns: `repeat(${width}, var(--tetris-cell))`, ...vars } as CSSProperties}>
      {Array.from({ length: width * height }, (_, i) => <div key={i} className="tetris-dot" />)}
    </div>
  );
}
