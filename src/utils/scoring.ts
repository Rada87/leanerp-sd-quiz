import {
  MAX_POINTS_PER_QUESTION,
  MIN_POINTS_CORRECT,
  SCORING_EXPONENT,
} from "../constants";

export function calculatePoints(
  remainingTime: number,
  totalTime: number
): number {
  if (remainingTime <= 0 || totalTime <= 0) return 0;

  const remainingRatio = Math.min(remainingTime / totalTime, 1);
  const raw = Math.round(
    MAX_POINTS_PER_QUESTION * Math.pow(remainingRatio, SCORING_EXPONENT)
  );

  return Math.max(raw, MIN_POINTS_CORRECT);
}
