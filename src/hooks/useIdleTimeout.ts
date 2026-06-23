import { useEffect, useRef } from "react";

export function useIdleTimeout(
  timeoutMs: number,
  onIdle: () => void,
  isActive: boolean
) {
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  useEffect(() => {
    if (!isActive) return;

    let timerId = setTimeout(() => onIdleRef.current(), timeoutMs);

    const resetTimer = () => {
      clearTimeout(timerId);
      timerId = setTimeout(() => onIdleRef.current(), timeoutMs);
    };

    const events = ["click", "touchstart", "keydown"] as const;
    events.forEach((e) => window.addEventListener(e, resetTimer));

    return () => {
      clearTimeout(timerId);
      events.forEach((e) => window.removeEventListener(e, resetTimer));
    };
  }, [timeoutMs, isActive]);
}
