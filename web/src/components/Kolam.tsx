import type { CSSProperties } from "react";

/**
 * A kolam: a dot grid at the door, and one line that weaves between the dots without touching
 * them, curving round the dots at the edge. It is the progress and reward of every story.
 *
 * The line is a light ray bouncing at 45 degrees inside the grid's box (the classic sikku
 * construction): it crosses the midpoints between dots, and each bounce becomes an arc round
 * the nearest edge dot. With the dot counts coprime it is a single closed line.
 */

type Pt = [number, number];

/** Grid sizes (columns x rows) whose line is a single closed loop. */
const GRIDS: Pt[] = [
  [3, 4],
  [4, 5],
  [4, 3],
  [5, 4],
  [3, 5],
  [5, 6],
];

export function seedOf(text: string): number {
  let h = 2166136261;
  for (const ch of text) h = Math.imul(h ^ ch.codePointAt(0)!, 16777619);
  return h >>> 0;
}

const R = Math.SQRT1_2; // the bounce arc's radius: the line is tangent to it

const f = (n: number) => +n.toFixed(3);

/** The kolam's line(s) as SVG paths, in grid units: dots sit at odd coordinates. */
export function kolamPaths(cols: number, rows: number): string[] {
  const W = 2 * cols;
  const H = 2 * rows;
  const seen = new Set<string>();
  const paths: string[] = [];

  // Every curve passes the left wall at an odd y; start a new curve from any unseen one.
  for (let y0 = 1; y0 < H; y0 += 2) {
    for (const dy0 of [1, -1]) {
      if (seen.has(`0,${y0},1,${dy0}`)) continue;
      let x = 0;
      let y = y0;
      let dx = 1;
      let dy = dy0;
      // Walk the bounces: the turn points, the incoming and outgoing directions, the dot.
      const turns: { h: Pt; din: Pt; dout: Pt; dot: Pt }[] = [];
      let din: Pt = [-dx, dy]; // the direction that arrives at the start, before the bounce
      for (let guard = 0; guard < 4 * W * H; guard++) {
        const key = `${x},${y},${dx},${dy}`;
        if (seen.has(key)) break;
        seen.add(key);
        const dot: Pt = [x === 0 ? 1 : x === W ? W - 1 : x, y === 0 ? 1 : y === H ? H - 1 : y];
        turns.push({ h: [x, y], din, dout: [dx, dy], dot });
        // Fly to the next wall.
        const tx = dx > 0 ? W - x : x;
        const ty = dy > 0 ? H - y : y;
        const t = Math.min(tx, ty);
        x += dx * t;
        y += dy * t;
        din = [dx, dy];
        if (x === 0 || x === W) dx = -dx;
        if (y === 0 || y === H) dy = -dy;
      }
      paths.push(drawTurns(turns));
    }
  }
  return paths;
}

type Turn = { h: Pt; din: Pt; dout: Pt; dot: Pt };

const same = (a: Pt, b: Pt) => a[0] === b[0] && a[1] === b[1];

function drawTurns(input: Turn[]): string {
  // Two bounces round the same corner dot become one half-circle round it. If the walk
  // started between such a pair, rotate so the pair is together.
  const turns =
    input.length > 1 && same(input[0].dot, input[input.length - 1].dot)
      ? [input[input.length - 1], ...input.slice(0, -1)]
      : input;
  const arcs: { from: Pt; to: Pt; sweep: number }[] = [];
  for (let i = 0; i < turns.length; i++) {
    const a = turns[i];
    const from: Pt = [a.h[0] - a.din[0] / 2, a.h[1] - a.din[1] / 2];
    let to: Pt = [a.h[0] + a.dout[0] / 2, a.h[1] + a.dout[1] / 2];
    // The way round: the sign of the turn from the arc's start to its end, about the dot.
    const cross = (from[0] - a.dot[0]) * (to[1] - a.dot[1]) - (from[1] - a.dot[1]) * (to[0] - a.dot[0]);
    const b = turns[i + 1];
    if (b && same(b.dot, a.dot)) {
      to = [b.h[0] + b.dout[0] / 2, b.h[1] + b.dout[1] / 2];
      i++;
    }
    arcs.push({ from, to, sweep: cross > 0 ? 1 : 0 });
  }
  let d = `M${f(arcs[0].from[0])} ${f(arcs[0].from[1])}`;
  arcs.forEach((a, i) => {
    if (i > 0) d += ` L${f(a.from[0])} ${f(a.from[1])}`;
    d += ` A${f(R)} ${f(R)} 0 0 ${a.sweep} ${f(a.to[0])} ${f(a.to[1])}`;
  });
  return `${d} Z`;
}

export type KolamProps = {
  /** Anything stable (a story id): the same seed always gives the same kolam. */
  seed: string;
  /** How much of the line is drawn, 0 to 1. */
  progress?: number;
  /** "still": drawn to `progress`; "draw": draws in once; "loop": draws over and over (a wait). */
  mode?: "still" | "draw" | "loop";
  /** "rice" on the wall or a page, "chalk" on the slate, "leaf" for a finished story. */
  tone?: "rice" | "chalk" | "leaf" | "peacock";
  className?: string;
  /** Accessible name; decorative when absent. */
  label?: string;
  style?: CSSProperties;
};

export function Kolam({
  seed,
  progress = 1,
  mode = "still",
  tone = "peacock",
  className,
  label,
  style,
}: KolamProps) {
  const [cols, rows] = GRIDS[seedOf(seed) % GRIDS.length];
  const paths = kolamPaths(cols, rows);
  const W = 2 * cols;
  const H = 2 * rows;
  const p = Math.max(0, Math.min(1, progress));
  const dots: Pt[] = [];
  for (let i = 0; i < cols; i++) for (let j = 0; j < rows; j++) dots.push([2 * i + 1, 2 * j + 1]);
  return (
    <svg
      className={["kolam", `kolam--${tone}`, `kolam--${mode}`, className].filter(Boolean).join(" ")}
      viewBox={`0 0 ${W} ${H}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ "--kolam-p": p, ...style } as CSSProperties}
    >
      {dots.map(([x, y]) => (
        <circle key={`${x}-${y}`} className="kolam__dot" cx={x} cy={y} r={0.13} />
      ))}
      {paths.map((d, i) => (
        // The line drawing is kept under reduced motion (slower when it loops): it is not movement.
        <path key={i} className="kolam__line keep-motion" d={d} pathLength={1} />
      ))}
    </svg>
  );
}
