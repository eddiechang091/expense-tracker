// Sound synthesis for the interactive lucky cat (Money Buddy).
//
// Pure Web Audio API — zero audio files, zero dependencies.
//
// Design notes:
// - A single shared AudioContext is created lazily on first use and
//   resumed if suspended (browsers require a user gesture before audio).
// - Every play function is fire-and-forget and never throws; all errors
//   are swallowed internally so a sound failure can never break the UI.
// - Sounds are gated by a module-level enabled toggle (default on).

let ctx: AudioContext | null = null;
let soundOn = true;

/** Enable or disable all cat sounds. */
export function setSoundEnabled(on: boolean): void {
  soundOn = on;
}

/** Whether cat sounds are currently enabled. */
export function isSoundEnabled(): boolean {
  return soundOn;
}

interface WindowWithWebkitAudio extends Window {
  webkitAudioContext?: typeof AudioContext;
}

/** Lazily create (and resume) the shared AudioContext. Null when unavailable. */
function getContext(): AudioContext | null {
  try {
    if (typeof window === "undefined") return null;
    if (!ctx) {
      const w = window as WindowWithWebkitAudio;
      const AC = window.AudioContext ?? w.webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") {
      void ctx.resume().catch(() => {
        /* resume rejected (no gesture yet) — next call retries */
      });
    }
    return ctx;
  } catch {
    return null;
  }
}

/** Master envelope helper: quick attack, smooth exponential decay. */
function adsr(
  ac: AudioContext,
  t0: number,
  peak: number,
  attack: number,
  dur: number,
): GainNode {
  const gain = ac.createGain();
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(peak, t0 + attack);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  return gain;
}

/**
 * Happy "meow": pitch sweeps 550Hz -> 850Hz -> 450Hz over ~0.45s,
 * with gentle vibrato and a natural attack/decay envelope.
 */
export function playMeow(): void {
  try {
    if (!soundOn) return;
    const ac = getContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const dur = 0.45;

    const osc = ac.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(550, t0);
    osc.frequency.linearRampToValueAtTime(850, t0 + dur * 0.45);
    osc.frequency.linearRampToValueAtTime(450, t0 + dur);

    // Vibrato: 9Hz LFO fading in shortly after the attack.
    const lfo = ac.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 9;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.setValueAtTime(0, t0);
    lfoDepth.gain.linearRampToValueAtTime(16, t0 + 0.1);
    lfo.connect(lfoDepth);
    lfoDepth.connect(osc.frequency);

    const gain = adsr(ac, t0, 0.45, 0.03, dur);
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t0);
    lfo.start(t0);
    osc.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
  } catch {
    /* never throw */
  }
}

/**
 * Cat purr: ~50Hz sine carrier amplitude-modulated at ~25Hz through a
 * soft lowpass, 2.5s with gentle fade in/out.
 */
export function playPurr(): void {
  try {
    if (!soundOn) return;
    const ac = getContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const dur = 2.5;

    const carrier = ac.createOscillator();
    carrier.type = "sine";
    carrier.frequency.value = 50;

    // AM at 25Hz around a 0.4 base so the modulation never inverts phase.
    const amGain = ac.createGain();
    amGain.gain.value = 0.4;
    const lfo = ac.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 25;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.32;
    lfo.connect(lfoDepth);
    lfoDepth.connect(amGain.gain);
    carrier.connect(amGain);

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 220;
    amGain.connect(filter);

    // Gentle fade in/out envelope.
    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.5, t0 + 0.4);
    master.gain.setValueAtTime(0.5, t0 + dur - 0.5);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    filter.connect(master);
    master.connect(ac.destination);

    carrier.start(t0);
    lfo.start(t0);
    carrier.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
  } catch {
    /* never throw */
  }
}

/**
 * Sleeping snore: deeper and slower than a purr — ~35Hz carrier with
 * ~9Hz amplitude modulation over 3s, plus a slow 0.3Hz pitch wobble so it
 * feels like breathing cycles.
 */
export function playSnore(): void {
  try {
    if (!soundOn) return;
    const ac = getContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const dur = 3.0;

    const carrier = ac.createOscillator();
    carrier.type = "sine";
    carrier.frequency.setValueAtTime(35, t0);
    // Breathing wobble: slow drift of the carrier pitch.
    const breath = ac.createOscillator();
    breath.type = "sine";
    breath.frequency.value = 0.3;
    const breathDepth = ac.createGain();
    breathDepth.gain.value = 4;
    breath.connect(breathDepth);
    breathDepth.connect(carrier.frequency);

    // AM at 9Hz.
    const amGain = ac.createGain();
    amGain.gain.value = 0.4;
    const lfo = ac.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 9;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.32;
    lfo.connect(lfoDepth);
    lfoDepth.connect(amGain.gain);
    carrier.connect(amGain);

    const filter = ac.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 160;
    amGain.connect(filter);

    const master = ac.createGain();
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(0.45, t0 + 0.5);
    master.gain.setValueAtTime(0.45, t0 + dur - 0.6);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    filter.connect(master);
    master.connect(ac.destination);

    carrier.start(t0);
    lfo.start(t0);
    breath.start(t0);
    carrier.stop(t0 + dur + 0.05);
    lfo.stop(t0 + dur + 0.05);
    breath.stop(t0 + dur + 0.05);
  } catch {
    /* never throw */
  }
}

/** Short cute "pop" for item drops: sine blip sweeping 800Hz -> 1200Hz in 0.15s. */
export function playPop(): void {
  try {
    if (!soundOn) return;
    const ac = getContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const dur = 0.15;

    const osc = ac.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(800, t0);
    osc.frequency.exponentialRampToValueAtTime(1200, t0 + dur);

    const gain = adsr(ac, t0, 0.35, 0.015, dur);
    osc.connect(gain);
    gain.connect(ac.destination);

    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* never throw */
  }
}

const CHECKIN_NOTES = [523.25, 659.25, 783.99]; // C5, E5, G5

/** Daily check-in jingle: tiny happy ascending arpeggio, 0.5s total. */
export function playCheckin(): void {
  try {
    if (!soundOn) return;
    const ac = getContext();
    if (!ac) return;
    const t0 = ac.currentTime;
    const noteDur = 0.5 / CHECKIN_NOTES.length;

    CHECKIN_NOTES.forEach((freq, i) => {
      const start = t0 + i * noteDur;
      const osc = ac.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      const gain = adsr(ac, start, 0.32, 0.02, noteDur * 1.6);
      osc.connect(gain);
      gain.connect(ac.destination);
      osc.start(start);
      osc.stop(start + noteDur * 1.7);
    });
  } catch {
    /* never throw */
  }
}
