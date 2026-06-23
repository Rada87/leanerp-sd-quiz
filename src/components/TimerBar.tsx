interface TimerBarProps {
  remainingTime: number;
  totalTime: number;
}

export function TimerBar({ remainingTime, totalTime }: TimerBarProps) {
  const ratio = Math.max(remainingTime / totalTime, 0);
  const percentage = ratio * 100;

  let color = "var(--color-primary)";
  if (ratio < 0.25) color = "var(--color-error)";
  else if (ratio < 0.5) color = "#ffa726";

  return (
    <div
      style={{
        width: "100%",
        height: 8,
        background: "var(--color-border)",
        borderRadius: 4,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          width: `${percentage}%`,
          height: "100%",
          background: color,
          borderRadius: 4,
          transition: "width 100ms linear, background 0.5s",
          boxShadow: ratio < 0.25 ? `0 0 8px ${color}` : undefined,
        }}
      />
    </div>
  );
}
