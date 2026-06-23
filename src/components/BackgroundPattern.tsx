const patternSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60">
  <path d="M15 5 L20 10 L15 15" stroke="rgba(109,255,163,0.04)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  <path d="M40 25 L45 30 L40 35" stroke="rgba(109,255,163,0.03)" stroke-width="1" fill="none" stroke-linecap="round"/>
  <line x1="5" y1="45" x2="15" y2="45" stroke="rgba(109,255,163,0.03)" stroke-width="1" stroke-linecap="round"/>
  <line x1="45" y1="50" x2="55" y2="50" stroke="rgba(109,255,163,0.025)" stroke-width="1" stroke-linecap="round"/>
</svg>
`.trim();

const encodedPattern = `url("data:image/svg+xml,${encodeURIComponent(patternSvg)}")`;

export function BackgroundPattern() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundImage: encodedPattern,
        backgroundRepeat: "repeat",
        pointerEvents: "none",
      }}
    />
  );
}
