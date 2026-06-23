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

interface Pad {
  x: number;
  y: number;
  radius: number;
  isVia: boolean;
}

interface Pulse {
  traceIndex: number;
  progress: number;
  speed: number;
  pulseLength: number;
}

const GRID = 50;
const COLOR: [number, number, number] = [63, 229, 132];
const STATIC_ALPHA = 0.15;
const PAD_ALPHA = 0.22;
const MAX_PULSES = 4;
const SPAWN_MIN_MS = 1000;
const SPAWN_MAX_MS = 2500;
const DURATION_MIN_S = 4;
const DURATION_MAX_S = 7;

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function randInt(min: number, max: number) {
  return Math.floor(rand(min, max + 1));
}

function rgba(r: number, g: number, b: number, a: number) {
  return `rgba(${r},${g},${b},${a})`;
}

function generateLayout(w: number, h: number) {
  const cols = Math.ceil(w / GRID) + 1;
  const rows = Math.ceil(h / GRID) + 1;
  const traces: Trace[] = [];
  const pads: Pad[] = [];
  const padKeys = new Set<string>();
  const count = Math.max(20, Math.floor((cols * rows) / 6));

  for (let n = 0; n < count; n++) {
    let cx = randInt(0, cols - 1);
    let cy = randInt(0, rows - 1);
    const pts: Point[] = [{ x: cx * GRID, y: cy * GRID }];
    let horiz = Math.random() > 0.5;
    const bends = randInt(2, 6);

    for (let b = 0; b < bends; b++) {
      const steps = randInt(1, 5);
      const dir = Math.random() > 0.5 ? 1 : -1;
      if (horiz) {
        cx = Math.max(0, Math.min(cols - 1, cx + steps * dir));
      } else {
        cy = Math.max(0, Math.min(rows - 1, cy + steps * dir));
      }
      const np = { x: cx * GRID, y: cy * GRID };
      const lp = pts[pts.length - 1];
      if (np.x !== lp.x || np.y !== lp.y) pts.push(np);
      horiz = !horiz;
    }

    if (pts.length < 2) continue;

    let totalLength = 0;
    const segLens: number[] = [];
    for (let i = 1; i < pts.length; i++) {
      const l =
        Math.abs(pts[i].x - pts[i - 1].x) +
        Math.abs(pts[i].y - pts[i - 1].y);
      segLens.push(l);
      totalLength += l;
    }
    if (totalLength < GRID * 2) continue;

    traces.push({ points: pts, totalLength, segmentLengths: segLens });

    for (let i = 0; i < pts.length; i++) {
      if (i === 0 || i === pts.length - 1 || Math.random() > 0.65) {
        const key = `${pts[i].x},${pts[i].y}`;
        if (!padKeys.has(key)) {
          padKeys.add(key);
          pads.push({
            x: pts[i].x,
            y: pts[i].y,
            radius: rand(2, 3.5),
            isVia: Math.random() > 0.6,
          });
        }
      }
    }
  }

  return { traces, pads };
}

function drawStaticLayer(
  sctx: CanvasRenderingContext2D,
  traces: Trace[],
  pads: Pad[],
) {
  const [r, g, b] = COLOR;

  sctx.strokeStyle = rgba(r, g, b, STATIC_ALPHA);
  sctx.lineWidth = 1;
  sctx.lineCap = "round";
  sctx.lineJoin = "round";

  for (const tr of traces) {
    sctx.beginPath();
    sctx.moveTo(tr.points[0].x, tr.points[0].y);
    for (let i = 1; i < tr.points.length; i++) {
      sctx.lineTo(tr.points[i].x, tr.points[i].y);
    }
    sctx.stroke();
  }

  for (const pad of pads) {
    if (pad.isVia) {
      sctx.beginPath();
      sctx.arc(pad.x, pad.y, pad.radius * 0.5, 0, Math.PI * 2);
      sctx.fillStyle = rgba(r, g, b, PAD_ALPHA);
      sctx.fill();
      sctx.beginPath();
      sctx.arc(pad.x, pad.y, pad.radius + 1, 0, Math.PI * 2);
      sctx.strokeStyle = rgba(r, g, b, PAD_ALPHA * 0.7);
      sctx.lineWidth = 0.8;
      sctx.stroke();
    } else {
      sctx.beginPath();
      sctx.arc(pad.x, pad.y, pad.radius, 0, Math.PI * 2);
      sctx.fillStyle = rgba(r, g, b, PAD_ALPHA);
      sctx.fill();
    }
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
      drawStaticLayer(sctx, traces, layout.pads);
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
          pulseLength: rand(60, 120),
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

      const [r, g, b] = COLOR;

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
        ctx!.strokeStyle = rgba(r, g, b, 0.5 * alpha);
        ctx!.lineWidth = 3;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.shadowBlur = 16;
        ctx!.shadowColor = rgba(r, g, b, 0.6 * alpha);
        ctx!.stroke();
        ctx!.restore();

        ctx!.save();
        ctx!.beginPath();
        drawTracePortion(ctx!, trace, center - half * 0.35, center + half * 0.35);
        ctx!.strokeStyle = rgba(r, g, b, 0.9 * alpha);
        ctx!.lineWidth = 1.5;
        ctx!.lineCap = "round";
        ctx!.lineJoin = "round";
        ctx!.shadowBlur = 6;
        ctx!.shadowColor = rgba(r, g, b, 0.8 * alpha);
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
