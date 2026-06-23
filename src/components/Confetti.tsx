import { useEffect, useRef } from "react";

const COLORS = [
  "#6DFFA3",
  "#3FE584",
  "#FFD700",
  "#FFC107",
  "#FF6B9D",
  "#FF4D6A",
  "#4DC9F6",
  "#36A2EB",
  "#FFFFFF",
  "#A855F7",
  "#FF9F43",
];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  w: number;
  h: number;
  rot: number;
  rotSpeed: number;
  color: string;
  opacity: number;
  decay: number;
  gravity: number;
}

function spawn(
  cx: number,
  cy: number,
  count: number,
  spread: number,
): Particle[] {
  const out: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = 3 + Math.random() * spread * 0.04;
    out.push({
      x: cx + (Math.random() - 0.5) * 40,
      y: cy + (Math.random() - 0.5) * 30,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 3 - Math.random() * 5,
      w: 4 + Math.random() * 8,
      h: 4 + Math.random() * 14,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.3,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      opacity: 1,
      decay: 0.003 + Math.random() * 0.004,
      gravity: 0.12 + Math.random() * 0.1,
    });
  }
  return out;
}

interface ConfettiProps {
  count?: number;
  spread?: number;
}

export function Confetti({ count = 80, spread = 400 }: ConfettiProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    const dpr = window.devicePixelRatio || 1;
    const w = window.innerWidth;
    const h = window.innerHeight;
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);

    const cx = w / 2;
    const cy = h * 0.35;

    const particles: Particle[] = spawn(cx, cy, Math.ceil(count * 0.7), spread);

    const burst2 = setTimeout(() => {
      particles.push(...spawn(cx, cy, Math.ceil(count * 0.3), spread * 0.8));
    }, 250);

    let raf: number;

    function animate() {
      c!.clearRect(0, 0, w, h);
      let alive = false;

      for (const p of particles) {
        if (p.opacity <= 0) continue;
        alive = true;

        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.99;
        p.rot += p.rotSpeed;
        p.opacity -= p.decay;
        if (p.opacity < 0) p.opacity = 0;

        c!.save();
        c!.translate(p.x, p.y);
        c!.rotate(p.rot);
        c!.globalAlpha = p.opacity;
        c!.fillStyle = p.color;

        if (p.w > 9) {
          c!.beginPath();
          c!.arc(0, 0, p.w * 0.3, 0, Math.PI * 2);
          c!.fill();
          c!.shadowBlur = 8;
          c!.shadowColor = p.color;
          c!.fill();
        } else {
          c!.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        }

        c!.restore();
      }

      if (alive) {
        raf = requestAnimationFrame(animate);
      }
    }

    raf = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(burst2);
    };
  }, [count, spread]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
      }}
    />
  );
}
