// Short synthesized sound effects for the cat companion, via Web Audio API.
// No audio assets needed — all sounds are generated procedurally and kept
// under ~1.5s per the "short sounds" requirement.

let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  ac: AudioContext,
  opts: {
    freq: number;
    freqEnd?: number;
    at: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
  }
) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = opts.type ?? "sine";
  osc.frequency.setValueAtTime(opts.freq, ac.currentTime + opts.at);
  if (opts.freqEnd) {
    osc.frequency.exponentialRampToValueAtTime(opts.freqEnd, ac.currentTime + opts.at + opts.dur);
  }
  const peak = opts.gain ?? 0.12;
  g.gain.setValueAtTime(0.0001, ac.currentTime + opts.at);
  g.gain.exponentialRampToValueAtTime(peak, ac.currentTime + opts.at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + opts.at + opts.dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + opts.at);
  osc.stop(ac.currentTime + opts.at + opts.dur + 0.05);
}

/** Happy chime — feeding, grooming, playing. Two quick ascending notes. */
export function playHappy() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: 660, at: 0, dur: 0.12, type: "triangle" });
  tone(ac, { freq: 880, at: 0.1, dur: 0.18, type: "triangle" });
}

/** Soft snore — sleeping. Low wobble, ~1.2s. */
export function playSnore() {
  const ac = audio();
  if (!ac) return;
  // Two snore "breaths": low sine sliding down slightly.
  tone(ac, { freq: 140, freqEnd: 90, at: 0, dur: 0.5, type: "sine", gain: 0.08 });
  tone(ac, { freq: 130, freqEnd: 85, at: 0.6, dur: 0.5, type: "sine", gain: 0.08 });
}

/** Yawn — waking up. Gentle descending slide, ~0.8s. */
export function playYawn() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: 420, freqEnd: 180, at: 0, dur: 0.7, type: "sine", gain: 0.1 });
}

/** Soft pop — check-in, milestone, item drop. */
export function playPop() {
  const ac = audio();
  if (!ac) return;
  tone(ac, { freq: 520, freqEnd: 780, at: 0, dur: 0.12, type: "sine", gain: 0.1 });
}
