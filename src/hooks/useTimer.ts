import { useCallback, useEffect, useRef, useState } from "react";

interface UseTimerOptions {
  durationSeconds: number;
  onExpire: () => void;
  isRunning: boolean;
}

export function useTimer({ durationSeconds, onExpire, isRunning }: UseTimerOptions) {
  const [remainingTime, setRemainingTime] = useState(durationSeconds);
  const startedAtRef = useRef<number | null>(null);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  const resetTimer = useCallback(() => {
    startedAtRef.current = null;
    setRemainingTime(durationSeconds);
  }, [durationSeconds]);

  useEffect(() => {
    if (!isRunning) {
      startedAtRef.current = null;
      return;
    }

    startedAtRef.current = performance.now();
    const startSnapshot = startedAtRef.current;

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startSnapshot) / 1000;
      const remaining = Math.max(durationSeconds - elapsed, 0);
      setRemainingTime(remaining);

      if (remaining <= 0) {
        clearInterval(interval);
        onExpireRef.current();
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isRunning, durationSeconds]);

  return { remainingTime, resetTimer };
}
