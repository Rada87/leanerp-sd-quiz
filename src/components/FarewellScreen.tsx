import { motion } from "framer-motion";

/**
 * Shown once a visitor's device has used up its play time. It is the end of
 * the road for that device, so it carries no buttons back into the quiz —
 * only the thank-you. The stand's tablets never reach this screen.
 */

function WavingRobot() {
  return (
    <svg
      width="200"
      height="200"
      viewBox="0 0 200 200"
      fill="none"
      aria-hidden="true"
      style={{ display: "block", margin: "0 auto", maxWidth: "100%" }}
    >
      <defs>
        <radialGradient id="farewell-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="100" cy="100" r="92" fill="url(#farewell-glow)" />

      {/* antenna */}
      <line x1="100" y1="34" x2="100" y2="50" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" />
      <motion.circle
        cx="100"
        cy="30"
        r="5"
        fill="var(--color-primary)"
        animate={{ opacity: [1, 0.35, 1] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* head */}
      <rect
        x="52"
        y="50"
        width="96"
        height="72"
        rx="24"
        fill="var(--color-bg-card-hover)"
        stroke="var(--color-primary)"
        strokeWidth="3"
      />

      {/* eyes — a slow blink keeps it from looking like a frozen page */}
      <motion.g
        animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
        transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.82, 0.87, 0.92, 1] }}
        style={{ transformOrigin: "100px 82px" }}
      >
        <circle cx="80" cy="82" r="9" fill="var(--color-primary)" />
        <circle cx="120" cy="82" r="9" fill="var(--color-primary)" />
      </motion.g>

      {/* smile */}
      <path
        d="M82 102 Q100 114 118 102"
        stroke="var(--color-primary)"
        strokeWidth="3"
        strokeLinecap="round"
        fill="none"
      />

      {/* body */}
      <rect
        x="68"
        y="132"
        width="64"
        height="40"
        rx="14"
        fill="var(--color-bg-card-hover)"
        stroke="var(--color-primary)"
        strokeWidth="3"
      />
      <line x1="88" y1="152" x2="112" y2="152" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" opacity="0.6" />

      {/* waving arm */}
      <motion.g
        style={{ transformOrigin: "140px 146px" }}
        animate={{ rotate: [0, -22, 6, -22, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut", repeatDelay: 0.6 }}
      >
        <line
          x1="134"
          y1="146"
          x2="160"
          y2="124"
          stroke="var(--color-primary)"
          strokeWidth="5"
          strokeLinecap="round"
        />
        <circle cx="163" cy="120" r="7" fill="var(--color-primary)" />
      </motion.g>

      {/* resting arm */}
      <line x1="66" y1="146" x2="44" y2="160" stroke="var(--color-primary)" strokeWidth="5" strokeLinecap="round" opacity="0.5" />
      <circle cx="41" cy="162" r="6" fill="var(--color-primary)" opacity="0.5" />
    </svg>
  );
}

export function FarewellScreen() {
  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <motion.div
        className="screen-card"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{ textAlign: "center" }}
      >
        <WavingRobot />

        <h2
          style={{
            fontSize: "clamp(2rem, 6vw, 2.9rem)",
            fontWeight: 800,
            lineHeight: 1.15,
            margin: "18px 0 18px",
          }}
        >
          Thanks for your visit!
        </h2>

        <p
          style={{
            fontSize: "1rem",
            lineHeight: 1.7,
            color: "var(--color-text-muted)",
            maxWidth: 440,
            margin: "0 auto",
          }}
        >
          Your quiz session has ended. The <strong style={{ color: "var(--color-text)" }}>LEAN ERP team</strong>{" "}
          thanks you for visiting our stand.
        </p>

        <div
          style={{
            marginTop: 28,
            paddingTop: 18,
            borderTop: "1px solid var(--color-border)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            alignItems: "center",
          }}
        >
          <div
            style={{
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--color-text-muted)",
              opacity: 0.7,
            }}
          >
            LEAN ERP &middot; Škoda GCC
          </div>
          <a
            href="https://gcc.skoda-auto.com/lean-erp"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: "0.9rem",
              fontWeight: 600,
              color: "var(--color-primary)",
              textDecoration: "none",
              borderBottom: "1px solid var(--color-primary)",
              paddingBottom: 1,
              wordBreak: "break-word",
            }}
          >
            gcc.skoda-auto.com/lean-erp
          </a>
        </div>
      </motion.div>
    </div>
  );
}
