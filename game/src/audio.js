// SOLMAR HEAT — audio: every sound is synthesized with WebAudio, no files.
// A soft synthwave loop (bass + pad + hats), engine hum, siren, punch, cash.
export function createAudio() {
  let ctx = null;
  let master = null;
  let musicGain = null;
  let engineOsc = null;
  let engineGain = null;
  let muted = false;
  let musicTimer = null;
  let step = 0;

  function ensure() {
    if (ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
      musicGain = ctx.createGain();
      musicGain.gain.value = 0.16;
      musicGain.connect(master);
      engineOsc = ctx.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 55;
      engineGain = ctx.createGain();
      engineGain.gain.value = 0;
      const filt = ctx.createBiquadFilter();
      filt.type = 'lowpass';
      filt.frequency.value = 420;
      engineOsc.connect(filt);
      filt.connect(engineGain);
      engineGain.connect(master);
      engineOsc.start();
    } catch {
      return false;
    }
    return true;
  }

  function tone(freq, dur, type, vol, when = 0, slideTo = 0) {
    if (!ctx || muted) return;
    const t0 = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g);
    g.connect(master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  // Bass line: A minor groove, 8 steps, one bar looped by a timer.
  const BASS = [55, 0, 55, 0, 65.41, 0, 49, 0, 55, 0, 55, 0, 82.41, 0, 73.42, 0];
  function musicTick() {
    if (!ctx || muted) return;
    const note = BASS[step % BASS.length];
    if (note) tone(note, 0.22, 'triangle', 0.5);
    if (step % 4 === 0) tone(220, 0.5, 'sine', 0.08);
    if (step % 2 === 1) tone(6000, 0.03, 'square', 0.02);
    step += 1;
  }

  return {
    unlock() {
      if (!ensure()) return;
      if (ctx.state === 'suspended') ctx.resume();
      if (!musicTimer) musicTimer = window.setInterval(musicTick, 140);
    },
    setEngine(speed01, on) {
      if (!ctx) return;
      engineOsc.frequency.value = 50 + speed01 * 140;
      engineGain.gain.value = on && !muted ? 0.05 + speed01 * 0.05 : 0;
    },
    siren() { tone(700, 0.4, 'sine', 0.12, 0, 950); tone(950, 0.4, 'sine', 0.12, 0.4, 700); },
    punch() { tone(120, 0.12, 'square', 0.25, 0, 50); },
    cash() { tone(880, 0.12, 'sine', 0.2); tone(1318, 0.25, 'sine', 0.2, 0.1); },
    horn() { tone(330, 0.35, 'square', 0.12); tone(415, 0.35, 'square', 0.1); },
    crash() { tone(90, 0.3, 'sawtooth', 0.3, 0, 40); },
    click() { tone(660, 0.06, 'sine', 0.15); },
    busted() { tone(440, 0.5, 'sawtooth', 0.2, 0, 110); },
    toggleMute() {
      muted = !muted;
      if (master) master.gain.value = muted ? 0 : 0.5;
      return muted;
    },
    isMuted() { return muted; },
  };
}
