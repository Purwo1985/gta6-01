// SOLMAR HEAT — audio: every sound in the game is synthesized live with
// WebAudio, so the game ships no sound files at all. A soft synthwave
// loop (bass, pad, hats) under an engine hum, a two-tone siren, and one
// short blip per event: punch, cash, horn, crash, click, busted.
export function createAudio() {
  let context = null;
  let bus = null;
  let musicBus = null;
  let engineVoice = null;
  let engineLevel = null;
  let silenced = false;
  let grooveTimer = null;
  let beat = 0;

  function buildGraph() {
    if (context) return true;
    try {
      const AudioCtor = window.AudioContext || window.webkitAudioContext;
      context = new AudioCtor();
      bus = context.createGain();
      bus.gain.value = 0.5;
      bus.connect(context.destination);
      musicBus = context.createGain();
      musicBus.gain.value = 0.16;
      musicBus.connect(bus);
      const lowpass = context.createBiquadFilter();
      lowpass.type = 'lowpass';
      lowpass.frequency.value = 420;
      lowpass.connect(bus);
      engineLevel = context.createGain();
      engineLevel.gain.value = 0;
      engineLevel.connect(lowpass);
      engineVoice = context.createOscillator();
      engineVoice.type = 'sawtooth';
      engineVoice.frequency.value = 55;
      engineVoice.connect(engineLevel);
      engineVoice.start();
    } catch {
      return false;
    }
    return true;
  }

  // One envelope-shaped oscillator blip, optionally sliding in pitch.
  function blip(freq, length, wave, loudness, delay = 0, slideTo = 0) {
    if (!context || silenced) return;
    const start = context.currentTime + delay;
    const voice = context.createOscillator();
    const envelope = context.createGain();
    voice.type = wave;
    voice.frequency.setValueAtTime(freq, start);
    if (slideTo) {
      voice.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), start + length);
    }
    envelope.gain.setValueAtTime(loudness, start);
    envelope.gain.exponentialRampToValueAtTime(0.001, start + length);
    voice.connect(envelope);
    envelope.connect(bus);
    voice.start(start);
    voice.stop(start + length + 0.05);
  }

  // Bass groove in D minor, sixteen steps, looped by a timer.
  const BASSLINE = [73.42, 0, 73.42, 0, 87.31, 0, 65.41, 0, 73.42, 0, 73.42, 0, 110, 0, 98, 0];
  function grooveStep() {
    if (!context || silenced) return;
    const note = BASSLINE[beat % BASSLINE.length];
    if (note) blip(note, 0.22, 'triangle', 0.5);
    if (beat % 4 === 0) blip(293.66, 0.5, 'sine', 0.08);
    if (beat % 2 === 1) blip(6000, 0.03, 'square', 0.02);
    beat += 1;
  }

  return {
    unlock() {
      if (!buildGraph()) return;
      if (context.state === 'suspended') context.resume();
      if (!grooveTimer) grooveTimer = window.setInterval(grooveStep, 140);
    },
    setEngine(speed01, running) {
      if (!context) return;
      engineVoice.frequency.value = 50 + speed01 * 140;
      engineLevel.gain.value = running && !silenced ? 0.05 + speed01 * 0.05 : 0;
    },
    siren() {
      blip(700, 0.4, 'sine', 0.12, 0, 950);
      blip(950, 0.4, 'sine', 0.12, 0.4, 700);
    },
    punch() {
      blip(120, 0.12, 'square', 0.25, 0, 50);
    },
    cash() {
      blip(880, 0.12, 'sine', 0.2);
      blip(1318, 0.25, 'sine', 0.2, 0.1);
    },
    horn() {
      blip(330, 0.35, 'square', 0.12);
      blip(415, 0.35, 'square', 0.1);
    },
    crash() {
      blip(90, 0.3, 'sawtooth', 0.3, 0, 40);
    },
    click() {
      blip(660, 0.06, 'sine', 0.15);
    },
    busted() {
      blip(440, 0.5, 'sawtooth', 0.2, 0, 110);
    },
    toggleMute() {
      silenced = !silenced;
      if (bus) bus.gain.value = silenced ? 0 : 0.5;
      return silenced;
    },
    isMuted() {
      return silenced;
    },
  };
}
