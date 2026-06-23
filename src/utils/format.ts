import type { TierInfo } from "../types";

export function getTier(percentage: number): TierInfo {
  if (percentage >= 86) {
    return {
      name: "Enterprise Process Master",
      description:
        "Excellent. You think like a real SAP logistics expert.",
    };
  }
  if (percentage >= 61) {
    return {
      name: "LEAN ERP Specialist",
      description:
        "Strong result. You clearly understand how logistics and production processes fit together.",
    };
  }
  if (percentage >= 31) {
    return {
      name: "Process Explorer",
      description:
        "You understand the basics and you are ready to explore more.",
    };
  }
  return {
    name: "SAP Rookie",
    description:
      "You are just entering the world of logistics and enterprise processes.",
  };
}

export function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
