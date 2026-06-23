import { motion } from "framer-motion";
import { useMemo } from "react";

interface ConfettiProps {
  count?: number;
  spread?: number;
}

const COLORS = ["#6DFFA3", "#70FF9E", "#FFD700", "#FF6B9D", "#4DC9F6", "#FFFFFF"];

interface Particle {
  id: number;
  x: number;
  y: number;
  rotation: number;
  scale: number;
  color: string;
  delay: number;
}

export function Confetti({ count = 24, spread = 300 }: ConfettiProps) {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      x: (Math.random() - 0.5) * spread,
      y: -(Math.random() * spread + 100),
      rotation: Math.random() * 720 - 360,
      scale: Math.random() * 0.6 + 0.4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      delay: Math.random() * 0.3,
    }));
  }, [count, spread]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        pointerEvents: "none",
        zIndex: 100,
        overflow: "hidden",
      }}
    >
      {particles.map((p) => (
        <motion.div
          key={p.id}
          initial={{
            opacity: 1,
            x: "50vw",
            y: "40vh",
            scale: 0,
            rotate: 0,
          }}
          animate={{
            opacity: 0,
            x: `calc(50vw + ${p.x}px)`,
            y: `calc(40vh + ${p.y}px)`,
            scale: p.scale,
            rotate: p.rotation,
          }}
          transition={{
            duration: 1.2,
            delay: p.delay,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            width: 10,
            height: 10,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            background: p.color,
          }}
        />
      ))}
    </div>
  );
}
