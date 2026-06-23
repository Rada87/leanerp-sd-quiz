import { motion } from "framer-motion";

type AnswerState =
  | "default"
  | "selected-correct"
  | "selected-wrong"
  | "revealed-correct"
  | "disabled";

interface AnswerButtonProps {
  text: string;
  label: string;
  state: AnswerState;
  onSelect: () => void;
}

const stateStyles: Record<AnswerState, React.CSSProperties> = {
  default: {
    background: "var(--color-bg)",
    border: "2px solid var(--color-border)",
    color: "var(--color-text)",
  },
  "selected-correct": {
    background: "rgba(109, 255, 163, 0.12)",
    border: "2px solid var(--color-primary)",
    color: "var(--color-primary)",
  },
  "selected-wrong": {
    background: "rgba(255, 77, 106, 0.12)",
    border: "2px solid var(--color-error)",
    color: "var(--color-error)",
  },
  "revealed-correct": {
    background: "rgba(109, 255, 163, 0.06)",
    border: "2px solid rgba(109, 255, 163, 0.4)",
    color: "var(--color-primary)",
  },
  disabled: {
    background: "var(--color-bg)",
    border: "2px solid var(--color-border)",
    color: "var(--color-text-muted)",
    opacity: 0.5,
  },
};

const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.5 },
};

const bounceAnimation = {
  scale: [1, 1.04, 1],
  transition: { duration: 0.4 },
};

export function AnswerButton({ text, label, state, onSelect }: AnswerButtonProps) {
  const isInteractive = state === "default";
  const animate =
    state === "selected-wrong"
      ? shakeAnimation
      : state === "selected-correct"
        ? bounceAnimation
        : undefined;

  return (
    <motion.button
      onClick={isInteractive ? onSelect : undefined}
      animate={animate}
      whileHover={isInteractive ? { scale: 1.02 } : undefined}
      whileTap={isInteractive ? { scale: 0.98 } : undefined}
      style={{
        ...stateStyles[state],
        width: "100%",
        padding: "18px 24px",
        borderRadius: "var(--radius-md)",
        fontSize: "1.05rem",
        fontWeight: 500,
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 16,
        minHeight: 64,
        cursor: isInteractive ? "pointer" : "default",
        transition: "background 0.3s, border-color 0.3s, color 0.3s",
      }}
    >
      <span
        style={{
          width: 36,
          height: 36,
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "0.85rem",
          fontWeight: 700,
          flexShrink: 0,
          background:
            state === "selected-correct" || state === "revealed-correct"
              ? "var(--color-primary)"
              : state === "selected-wrong"
                ? "var(--color-error)"
                : "var(--color-border)",
          color:
            state === "selected-correct" ||
            state === "revealed-correct" ||
            state === "selected-wrong"
              ? "var(--color-bg)"
              : "var(--color-text)",
          transition: "background 0.3s, color 0.3s",
        }}
      >
        {label}
      </span>
      <span style={{ flex: 1 }}>{text}</span>
    </motion.button>
  );
}
