/** Small, locally synthesized cues. Audio is never queued while unavailable. */
export function createSoundEffects() {
  let context = null;
  let output = null;
  let enabled = true;
  let epoch = 0;
  const voices = new Set();
  const hidden = () => Boolean(globalThis.document?.hidden);
  const canPlay = () => enabled && !hidden() && context?.state === "running";

  function dispose(voice) {
    clearTimeout(voice.timer);
    voice.oscillator.onended = null;
    try { voice.oscillator.disconnect(); } catch {}
    try { voice.gain.disconnect(); } catch {}
    voices.delete(voice);
  }

  function stop() {
    epoch += 1;
    const now = context?.currentTime || 0;
    for (const voice of voices) {
      // Fade a sounding note; cancel future or suspended notes immediately.
      const fade = context?.state === "running" && voice.start <= now;
      if (fade && voice.stopping) continue;
      voice.stopping = true;
      try {
        const level = voice.gain.gain.value;
        voice.gain.gain.cancelScheduledValues(now);
        voice.gain.gain.setValueAtTime(fade ? Math.max(0, level) : 0, now);
        if (fade) {
          voice.gain.gain.linearRampToValueAtTime(0, now + 0.012);
          voice.oscillator.stop(now + 0.016);
          // Also disconnect if the audio clock is suspended before onended.
          voice.timer = setTimeout(() => dispose(voice), 50);
        } else {
          voice.oscillator.stop(now);
          dispose(voice);
        }
      } catch {
        dispose(voice);
      }
    }
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    if (!enabled) stop();
  }

  function unlock() {
    if (!enabled || hidden()) return Promise.resolve(false);
    try {
      if (!context || context.state === "closed") {
        const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
        if (typeof AudioContextClass !== "function") return Promise.resolve(false);
        // Creation and resume both happen in the caller's user-gesture stack.
        context = new AudioContextClass({ latencyHint: "interactive" });
        output = context.createGain();
        output.gain.value = 0.10;
        output.connect(context.destination);
        const created = context;
        created.addEventListener("statechange", () => {
          if (context === created && created.state !== "running") stop();
        });
      }
      if (context.state === "running") return Promise.resolve(true);

      // Discard anything scheduled before an interruption, before resuming it.
      stop();
      const target = context;
      const requestEpoch = epoch;
      const resumed = target.resume();
      return new Promise((resolve) => {
        let settled = false;
        const finish = (ready) => {
          if (settled) return;
          settled = true;
          clearTimeout(timer);
          resolve(ready);
        };
        // Some browsers leave resume pending when activation is unavailable.
        // A late permission grant must not replay an earlier button's cue.
        const timer = setTimeout(() => finish(false), 750);
        Promise.resolve(resumed).then(
          () => finish(context === target && epoch === requestEpoch && canPlay()),
          () => finish(false),
        );
      });
    } catch {
      return Promise.resolve(false);
    }
  }

  function tone(frequency, offset, duration, peak, endFrequency = frequency) {
    if (!canPlay() || !output) return;
    let oscillator;
    let gain;
    let voice;
    try {
      const start = context.currentTime + 0.004 + offset;
      const end = start + duration;
      oscillator = context.createOscillator();
      gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      if (endFrequency !== frequency) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency, end);
      }
      gain.gain.value = 0;
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, end - 0.008);
      gain.gain.linearRampToValueAtTime(0, end);
      oscillator.connect(gain);
      gain.connect(output);
      voice = { oscillator, gain, start, stopping: false, timer: null };
      voices.add(voice);
      oscillator.onended = () => dispose(voice);
      oscillator.start(start);
      oscillator.stop(end + 0.01);
    } catch {
      if (voice) dispose(voice);
      else {
        try { oscillator?.disconnect(); } catch {}
        try { gain?.disconnect(); } catch {}
      }
    }
  }

  function playStep(step) {
    if (!canPlay()) return;
    const number = Number(step);
    const index = Number.isFinite(number) ? Math.max(0, Math.min(2, Math.trunc(number) - 1)) : 0;
    const pitch = [660, 740, 830][index];
    tone(pitch, 0, 0.14, 0.45, pitch * 0.72);
  }

  function playComplete() {
    if (!canPlay()) return;
    tone(523.25, 0, 0.17, 0.34);
    tone(659.25, 0.13, 0.21, 0.32);
  }

  function playGoal() {
    if (!canPlay()) return;
    tone(523.25, 0, 0.42, 0.25);
    tone(659.25, 0.14, 0.42, 0.24);
    tone(783.99, 0.28, 0.42, 0.22);
  }

  globalThis.addEventListener?.("pagehide", stop);
  globalThis.document?.addEventListener("visibilitychange", () => {
    if (hidden()) stop();
  });

  return { unlock, setEnabled, playStep, playComplete, playGoal, stop };
}
