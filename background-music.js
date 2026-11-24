/** A user-started, looping BGM player. No playback is started during setup. */
export function createBackgroundMusic({ audio, volume = 0.15, onStateChange, onError } = {}) {
  if (!audio || typeof audio.play !== "function" || typeof audio.pause !== "function") {
    throw new TypeError("createBackgroundMusic requires an audio element");
  }

  const doc = audio.ownerDocument || globalThis.document;
  const view = doc?.defaultView || globalThis;
  const clampVolume = value => {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(0, Math.min(1, number)) : 0.15;
  };
  let state = { playing: false, pending: false, volume: clampVolume(volume) };
  let wanted = false;
  let playbackStarted = false;
  let requestId = 0;
  let resetWhenReady = false;
  let graphAttempted = false;
  let graphBroken = false;
  let context = null;
  let gain = null;

  const getState = () => ({ ...state });

  function update(patch) {
    const next = { ...state, ...patch };
    if (next.playing === state.playing && next.pending === state.pending && next.volume === state.volume) return;
    state = next;
    onStateChange?.(getState());
  }

  function stopElement() {
    try { audio.pause(); } catch { /* Pausing must also work before media loads. */ }
  }

  function resetPosition() {
    try {
      audio.currentTime = 0;
      resetWhenReady = false;
    } catch {
      resetWhenReady = true;
    }
  }

  function pause({ reset = false } = {}) {
    requestId += 1;
    wanted = false;
    playbackStarted = false;
    stopElement();
    if (reset) resetPosition();
    update({ playing: false, pending: false });
  }

  function syncPlayback() {
    if (wanted && doc?.hidden) {
      pause();
      return;
    }
    const playing = wanted && playbackStarted && !audio.paused && !audio.ended
      && (!context || context.state === "running");
    update({ playing, pending: wanted && !playing });
  }

  function applyVolume() {
    if (gain && context) {
      try {
        gain.gain.cancelScheduledValues?.(context.currentTime);
        if (typeof gain.gain.setValueAtTime === "function") {
          gain.gain.setValueAtTime(state.volume, context.currentTime);
        } else {
          gain.gain.value = state.volume;
        }
      } catch {
        try { gain.gain.value = state.volume; } catch { /* A closed context is handled on playback. */ }
      }
    }
    // On iPad the GainNode controls the level even when media.volume is ignored.
    try { audio.volume = gain ? 1 : state.volume; } catch { /* Native fallback is best effort. */ }
  }

  function setVolume(value) {
    update({ volume: clampVolume(value) });
    applyVolume();
    return state.volume;
  }

  function playbackError(error) {
    return audio.error || error?.name === "NotSupportedError"
      ? "曲を読み込めませんでした。もう一度BGMボタンを押してください。"
      : "BGMを再生できませんでした。もう一度BGMボタンを押してください。";
  }

  function fail(id, error) {
    if (id !== requestId || !wanted) return false;
    const message = playbackError(error);
    pause();
    onError?.(message);
    return false;
  }

  function ensureAudioGraph() {
    if (graphAttempted) return;
    graphAttempted = true;
    const AudioContext = view.AudioContext || view.webkitAudioContext;
    if (!AudioContext) {
      applyVolume();
      return;
    }

    let candidate = null;
    let source = null;
    try {
      candidate = new AudioContext();
      // Make the gain/output path first, before routing the media element into it.
      const nextGain = candidate.createGain();
      nextGain.gain.value = state.volume;
      nextGain.connect(candidate.destination);
      source = candidate.createMediaElementSource(audio);
      source.connect(nextGain);
      context = candidate;
      gain = nextGain;
    } catch {
      if (source && candidate) {
        // Once a MediaElementSource exists, keep a connected output route.
        context = candidate;
        try {
          source.disconnect();
          source.connect(candidate.destination);
        } catch {
          graphBroken = true;
        }
      } else if (candidate) {
        try { void candidate.close()?.catch?.(() => {}); } catch { /* Native media remains usable. */ }
      }
    }

    if (context) {
      context.addEventListener?.("statechange", () => {
        if (wanted && context.state === "closed") {
          fail(requestId);
        } else if (wanted && state.playing && context.state !== "running") {
          // An interruption needs a fresh tap; it must not resume unexpectedly.
          pause();
        } else {
          syncPlayback();
        }
      });
    }
    applyVolume();
  }

  function start() {
    if (doc?.hidden) {
      pause();
      return Promise.resolve(false);
    }
    const id = ++requestId;
    wanted = true;
    playbackStarted = false;
    update({ playing: false, pending: true });
    // The state callback may itself stop the player.
    if (id !== requestId || !wanted) return Promise.resolve(false);

    let resumeResult;
    let playResult;
    try {
      ensureAudioGraph();
      if (graphBroken || context?.state === "closed") return Promise.resolve(fail(id));
      if (audio.error) audio.load();
      if (resetWhenReady) resetPosition();
      audio.loop = true;
      audio.muted = false;
      // Both calls happen in the click's synchronous stack, without an await.
      resumeResult = context && context.state !== "running" ? context.resume() : undefined;
      playResult = audio.play();
    } catch (error) {
      // If play() threw after resume(), still observe the resume rejection.
      void Promise.resolve(resumeResult).catch(() => {});
      return Promise.resolve(fail(id, error));
    }

    return Promise.all([Promise.resolve(resumeResult), Promise.resolve(playResult)])
      .then(() => {
        if (id !== requestId || !wanted) {
          // Never stop a newer ON request when an older promise settles.
          if (!wanted) stopElement();
          return false;
        }
        // Modern play() resolves when playback begins. Older browsers use the event below.
        if (playResult && typeof playResult.then === "function" && !audio.paused) playbackStarted = true;
        syncPlayback();
        return state.playing;
      })
      .catch(error => fail(id, error));
  }

  function toggle() {
    if (wanted || state.playing || state.pending) {
      pause();
      return Promise.resolve(false);
    }
    return start();
  }

  audio.autoplay = false;
  audio.loop = true;
  stopElement();
  applyVolume();

  audio.addEventListener("playing", () => {
    if (!wanted || doc?.hidden) {
      if (wanted) pause();
      else stopElement();
      return;
    }
    playbackStarted = true;
    syncPlayback();
  });
  audio.addEventListener("waiting", () => {
    if (!wanted) return;
    playbackStarted = false;
    syncPlayback();
  });
  audio.addEventListener("pause", () => {
    // A queued old pause event must not cancel a newer play request.
    if (wanted && audio.paused) pause();
  });
  audio.addEventListener("ended", () => {
    if (audio.ended) pause();
  });
  audio.addEventListener("error", () => {
    if (wanted) fail(requestId, audio.error);
  });
  audio.addEventListener("loadedmetadata", () => {
    if (resetWhenReady) resetPosition();
  });
  view.addEventListener?.("pagehide", () => pause());
  doc?.addEventListener?.("visibilitychange", () => {
    if (doc.hidden) pause();
  });

  return { toggle, pause, setVolume, getState };
}
