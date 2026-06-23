import { useEffect, useRef } from "react";

interface Point {
  x: number;
  y: number;
}

interface Trace {
  points: Point[];
  totalLength: number;
  segmentLengths: number[];
}

interface Facet {
  points: [Point, Point, Point];
}

interface Node {
  x: number;
  y: number;
  size: number;
}

interface Pulse {
  traceIndex: number;
  progress: number;
  speed: number;
  pulseLength: number;
}

// Škoda emerald palette
const LINE_COLOR: [number, number, number] = [46, 169, 113]; // #2EA971
const FACET_COLOR: [number, number, number] = [14, 58, 47]; // #0E3A2F brand emerald
const NODE_COLOR: [number, number, number] = [70, 200, 140];
const PULSE_COLOR: [number, number, number] = [120, 250, 174]; // #78FAAE

const STEP = 74;
const STATIC_ALPHA = 0.16;
const NODE_ALPHA = 0.22;
const FACET_ALPHA = 0.16;
const MAX_PULSES = 4;
const SPAWN_MIN_MS = 1000;
const SPAWN_MAX_MS = 2500;
const DURATION_MIN_S = 4;
const DURATION_MAX_S = 7;

// Triangular (isometric) lattice — 6 directions at 60° increments.
const SIN60 = Math.sqrt(3) / 2;
// Neighbour moves in (i, j) lattice coords.
const MOVES: [number, number][] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
  [1, -1],
  [-1, 1],
];

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function rgba(c: [number, number, number], a: number) {
  return `rgba(${c[0]},${c[1]},${c[2]},${a})`;
}

// Convert lattice (i, j) to pixel coordinates.
function toPixel(i: number, j: number): Point {
  return { x: STEP * i + STEP * 0.5 * j, y: STEP * SIN60 * j };
}

function generateLayout(w: number, h: number) {
  const cols = Math.ceil(w / STEP) + 2;
  const rows = Math.ceil(h / (STEP * SIN60)) + 2;

  const traces: Trace[] = [];
  const nodes: Node[] = [];
  const facets: Facet[] = [];
  const nodeKeys = new Set<string>();

  const traceCount = Math.max(18, Math.floor((cols * rows) / 7));

  for (let n = 0; n < traceCount; n++) {
    // Random start on the lattice (offset i to keep x within view as j grows).
    let j = randInt(0, rows);
    let i = randInt(-Math.ceil(j / 2), cols);
    const latticePts: [number, number][] = [[i, j]];

    let moveIdx = randInt(0, MOVES.length - 1);
    const bends = randInt(3, 7);

    for (let b = 0; b < bends; b++) {
      // Turn by ±60° (adjacent direction) for sharp angular bends — never reverse.
      const turn = Math.random() > 0.5 ? 1 : -1;
      // Map the 6 moves around the clock so neighbours are ±60°.
      const order = [4, 0, 2, 5, 1, 3]; // clockwise ring of MOVES indices
      const pos = order.indexOf(moveIdx);
      moveIdx = order[(pos + turn + order.length) % order.length];

      const steps = randInt(1, 4);
      const [di, dj] = MOVES[moveIdx];
      i += di * steps;
      j += dj * steps;
      latticePts.push([i, j]);
    }

    const pts = latticePts.map(([li, lj]) => toPixel(li, lj));

    // Drop degenerate traces.
    let totalLength = 0;
    const segLens: number[] = [];
    for (let k = 1; k < pts.length; k++) {
      const l = Math.hypot(pts[k].x - pts[k - 1].x, pts[k].y - pts[k - 1].y);
      segLens.push(l);
      totalLength += l;
    }
    if (totalLength < STEP * 2) continue;

    traces.push({ points: pts, totalLength, segmentLengths: segLens });

    // Nodes at endpoints and some vertices.
    for (let k = 0; k < pts.length; k++) {
      if (k === 0 || k === pts.length - 1 || Math.random() > 0.6) {
        const key = `${Math.round(pts[k].x)},${Math.round(pts[k].y)}`;
        if (!nodeKeys.has(key)) {
          nodeKeys.add(key);
          nodes.push({ x: pts[k].x, y: pts[k].y, size: rand(2.5, 4.5) });
        }
      }
    }
  }

  // Crystalline facets — triangles on the lattice, occasionally larger.
  const facetCount = Math.floor(traceCount * 0.7);
  for (let n = 0; n < facetCount; n++) {
    const j = randInt(0, rows);
    const i = randInt(-Math.ceil(j / 2), cols);
    const scale = Math.random() > 0.7 ? randInt(2, 4) : 1;
    // Pick two adjacent directions to form a triangle.
    const order = [4, 0, 2, 5, 1, 3];
    const a = randInt(0, order.length - 1);
    const d1 = MOVES[order[a]];
    const d2 = MOVES[order[(a + 1) % order.length]];
    const p0 = toPixel(i, j);
    const p1 = toPixel(i + d1[0] * scale, j + d1[1] * scale);
    const p2 = toPixel(i + d2[0] * scale, j + d2[1] * scale);
    facets.push({ points: [p0, p1, p2] });
  }

  return { traces, nodes, facets };
}

function paintBackground(
  sctx: CanvasRenderingContext2D,
  w: number,
  h: number,
) {
  // Deep emerald radial wash — subtle Škoda emerald depth on near-black.
  const grad = sctx.createRadialGradient(
    w * 0.5,
    h * 0.42,
    0,
    w * 0.5,
    h * 0.42,
    Math.max(w, h) * 0.75,
  );
  grad.addColorStop(0, "rgb(9,26,20)");
  grad.addColorStop(0.55, "rgb(5,15,11)");
  grad.addColorStop(1, "rgb(2,6,5)");
  sctx.fillStyle = grad;
  sctx.fillRect(0, 0, w, h);
}

function drawStaticLayer(
  sctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  traces: Trace[],
  nodes: Node[],
  facets: Facet[],
) {
  paintBackground(sctx, w, h);

  // Facets first (behind lines).
  for (const f of facets) {
    const [p0, p1, p2] = f.points;
    sctx.beginPath();
    sctx.moveTo(p0.x, p0.y);
    sctx.lineTo(p1.x, p1.y);
    sctx.lineTo(p2.x, p2.y);
    sctx.closePath();
    sctx.fillStyle = rgba(FACET_COLOR, FACET_ALPHA);
    sctx.fill();
    sctx.strokeStyle = rgba(LINE_COLOR, STATIC_ALPHA * 0.6);
    sctx.lineWidth = 0.75;
    sctx.stroke();
  }

  // Angular traces.
  sctx.strokeStyle = rgba(LINE_COLOR, STATIC_ALPHA);
  sctx.lineWidth = 1;
  sctx.lineCap = "round";
  sctx.lineJoin = "miter";
  for (const tr of traces) {
    sctx.beginPath();
    sctx.moveTo(tr.points[0].x, tr.points[0].y);
    for (let i = 1; i < tr.points.length; i++) {
      sctx.lineTo(tr.points[i].x, tr.points[i].y);
    }
    sctx.stroke();
  }

  // Nodes as small emerald diamonds (rotated squares) — sharper, on-brand.
  sctx.fillStyle = rgba(NODE_COLOR, NODE_ALPHA);
  for (const node of nodes) {
    sctx.save();
    sctx.translate(node.x, node.y);
    sctx.rotate(Math.PI / 4);
    sctx.fillRect(-node.size / 2, -node.size / 2, node.size, node.size);
    sctx.restore();
  }
}

function drawTracePortion(
  ctx: CanvasRenderingContext2D,
  trace: Trace,
  fromDist: number,
  toDist: number,
) {
  let acc = 0;
  let started = false;

  for (let i = 0; i < trace.segmentLengths.length; i++) {
    const sLen = trace.segmentLengths[i];
    const sStart = acc;
    const sEnd = acc + sLen;

    if (sEnd <= fromDist || sStart >= toDist) {
      acc += sLen;
      continue;
    }

    const cs = Math.max(fromDist, sStart);
    const ce = Math.min(toDist, sEnd);
    const t1 = sLen > 0 ? (cs - sStart) / sLen : 0;
    const t2 = sLen > 0 ? (ce - sStart) / sLen : 1;

    const p = trace.points;
    const x1 = p[i].x + (p[i + 1].x - p[i].x) * t1;
    const y1 = p[i].y + (p[i + 1].y - p[i].y) * t1;
    const x2 = p[i].x + (p[i + 1].x - p[i].x) * t2;
    const y2 = p[i].y + (p[i + 1].y - p[i].y) * t2;

    if (!started) {
      ctx.moveTo(x1, y1);
      started = true;
    } else {
      ctx.lineTo(x1, y1);
    }
    ctx.lineTo(x2, y2);

    acc += sLen;
  }
}

export function BackgroundPattern() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    let raf = 0;
    let traces: Trace[] = [];
    let staticLayer: HTMLCanvasElement = document.createElement("canvas");
    let pulses: Pulse[] = [];
    let lastTime = 0;
    let lastSpawn = 0;
    let nextSpawnDelay = rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
    let visible = true;
    let w = 0;
    let h = 0;

    function setup() {
      const dpr = window.devicePixelRatio || 1;
      w = window.innerWidth;
      h = window.innerHeight;

      canvas!.width = w * dpr;
      canvas!.height = h * dpr;
      canvas!.style.width = `${w}px`;
      canvas!.style.height = `${h}px`;
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);

      const layout = generateLayout(w, h);
      traces = layout.traces;
      pulses = [];

      staticLayer = document.createElement("canvas");
      staticLayer.width = w * dpr;
      staticLayer.height = h * dpr;
      const sctx = staticLayer.getContext("2d")!;
      sctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      drawStaticLayer(sctx, w, h, traces, layout.nodes, layout.facets);
    }

    function drawFrame(time: number) {
      if (!visible) {
        raf = requestAnimationFrame(drawFrame);
        return;
      }

      const dt = lastTime ? Math.min((time - lastTime) / 1000, 0.1) : 0;
      lastTime = time;

      if (
        traces.length > 0 &&
        time - lastSpawn > nextSpawnDelay &&
        pulses.length < MAX_PULSES
      ) {
        pulses.push({
          traceIndex: randInt(0, traces.length - 1),
          progress: 0,
          speed: 1 / rand(DURATION_MIN_S, DURATION_MAX_S),
          pulseLength: rand(70, 140),
        });
        lastSpawn = time;
        nextSpawnDelay = rand(SPAWN_MIN_MS, SPAWN_MAX_MS);
      }

      for (const p of pulses) p.progress += p.speed * dt;
      pulses = pulses.filter((p) => p.progress <= 1.2);

      ctx!.save();
      ctx!.setTransform(1, 0, 0, 1, 0, 0);
      ctx!.clearRect(0, 0, canvas!.width, canvas!.height);
      ctx!.drawImage(staticLayer, 0, 0);
      ctx!.restore();

      for (const pulse of pulses) {
        const trace = traces[pulse.traceIndex];
        const center = pulse.progress * trace.totalLength;
        const half = pulse.pulseLength / 2;

        let alpha = 1;
        if (pulse.progress < 0.1) alpha = pulse.progress / 0.1;
        else if (pulse.progress > 0.9)
          alpha = Math.max(0, (1.2 - pulse.progress) / 0.3);

        ctx!.save();
        ctx!.beginPath();
        drawTracePortion(ctx!, trace, center - half, center + half);
        ctx!.strokeStyle = rgba(PULSE_COLOR, 0.5 * alpha);
        ctx!.lineWidth = 3;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.shadowBlur = 16;
        ctx!.shadowColor = rgba(PULSE_COLOR, 0.6 * alpha);
        ctx!.stroke();
        ctx!.restore();

        ctx!.save();
        ctx!.beginPath();
        drawTracePortion(
          ctx!,
          trace,
          center - half * 0.35,
          center + half * 0.35,
        );
        ctx!.strokeStyle = rgba(PULSE_COLOR, 0.95 * alpha);
        ctx!.lineWidth = 1.5;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.shadowBlur = 6;
        ctx!.shadowColor = rgba(PULSE_COLOR, 0.85 * alpha);
        ctx!.stroke();
        ctx!.restore();
      }

      raf = requestAnimationFrame(drawFrame);
    }

    setup();

    if (reducedMotion) {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.drawImage(staticLayer, 0, 0);
      ctx.restore();
    } else {
      raf = requestAnimationFrame(drawFrame);
    }

    let resizeTimer: ReturnType<typeof setTimeout>;
    const onResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        setup();
        if (reducedMotion) {
          ctx!.save();
          ctx!.setTransform(1, 0, 0, 1, 0, 0);
          ctx!.drawImage(staticLayer, 0, 0);
          ctx!.restore();
        }
      }, 250);
    };

    const onVisibility = () => {
      visible = !document.hidden;
      if (visible) lastTime = 0;
    };

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(resizeTimer);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        pointerEvents: "none",
      }}
    />
  );
}
