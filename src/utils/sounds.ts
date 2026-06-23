let audioCtx: AudioContext | null = null;

function ctx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType = "sine",
  vol = 0.1,
  delay = 0,
) {
  const c = ctx();
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.connect(gain);
  gain.connect(c.destination);
  osc.frequency.value = freq;
  osc.type = type;
  const t = c.currentTime + delay;
  gain.gain.setValueAtTime(vol, t);
  gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
  osc.start(t);
  osc.stop(t + dur);
}

export function playCorrect() {
  tone(523.25, 0.12, "sine", 0.1);
  tone(659.25, 0.12, "sine", 0.1, 0.07);
  tone(783.99, 0.18, "sine", 0.12, 0.14);
}

export function playWrong() {
  tone(420, 0.15, "sine", 0.1);
  tone(350, 0.18, "sine", 0.09, 0.1);
  tone(280, 0.3, "sine", 0.07, 0.22);
}

export function playTimeout() {
  tone(440, 0.12, "sine", 0.08);
  tone(349, 0.2, "sine", 0.06, 0.1);
}

export function playComplete() {
  tone(523.25, 0.15, "sine", 0.1);
  tone(659.25, 0.15, "sine", 0.1, 0.1);
  tone(783.99, 0.15, "sine", 0.1, 0.2);
  tone(1046.5, 0.35, "sine", 0.12, 0.3);
}
