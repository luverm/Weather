// Procedural ambient audio.
//
// All sounds are synthesized on the fly with WebAudio — no assets required.
// - Wind: pink noise through a bandpass filter whose Q and frequency wobble
// - Rain: white noise through a high-pass filter, intensity follows rain strength
// - Thunder: low-frequency boom on storm flashes (hook from the lightning scene)
// - Night: very subtle crickets (fast decaying high-pitched chirps on a timer)
//
// Gated behind an explicit user gesture — browsers block audio otherwise.

export class AmbientAudio {
  constructor() {
    this.ctx = null;
    this.enabled = false;
    this.master = null;
    this.windGain = null;
    this.windFilter = null;
    this.rainGain = null;
    this.nightGain = null;
    this.noiseBuffer = null;
    this.nightInterval = null;
    this.listeners = new Set();
  }

  isEnabled() { return this.enabled; }
  onChange(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); }

  async enable() {
    if (this.enabled) return;
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    await this.ctx.resume();

    this.master = this.ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(this.ctx.destination);

    this.noiseBuffer = this._createNoiseBuffer();

    // --- Wind: looping noise through bandpass ---
    const windSrc = this.ctx.createBufferSource();
    windSrc.buffer = this.noiseBuffer;
    windSrc.loop = true;
    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 400;
    this.windFilter.Q.value = 0.7;
    this.windGain = this.ctx.createGain();
    this.windGain.gain.value = 0;
    windSrc.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.master);
    windSrc.start();

    // --- Rain: noise through highpass ---
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = this.noiseBuffer;
    rainSrc.loop = true;
    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = "highpass";
    rainFilter.frequency.value = 1400;
    this.rainGain = this.ctx.createGain();
    this.rainGain.gain.value = 0;
    rainSrc.connect(rainFilter);
    rainFilter.connect(this.rainGain);
    this.rainGain.connect(this.master);
    rainSrc.start();

    // --- Night ambience gain (crickets triggered on interval) ---
    this.nightGain = this.ctx.createGain();
    this.nightGain.gain.value = 0;
    this.nightGain.connect(this.master);

    // Fade master up.
    const t = this.ctx.currentTime;
    this.master.gain.linearRampToValueAtTime(0.5, t + 0.6);
    this.enabled = true;
    for (const fn of this.listeners) fn(true);
  }

  async disable() {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(t);
    this.master.gain.linearRampToValueAtTime(0, t + 0.4);
    await new Promise((r) => setTimeout(r, 420));
    if (this.nightInterval) { clearInterval(this.nightInterval); this.nightInterval = null; }
    await this.ctx.close();
    this.ctx = null;
    this.enabled = false;
    for (const fn of this.listeners) fn(false);
  }

  /**
   * Update ambient levels from weather state.
   * @param {object} w - weather object
   * @param {string} bucket - time-of-day bucket
   */
  setWeather(w, bucket) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const ramp = 1.2;

    // Wind volume: scales with wind speed, softer when clear, louder when stormy.
    const windSpeed = w.windSpeed ?? 0;
    let windTarget = Math.min(0.25, windSpeed / 60);
    if (w.condition === "storm") windTarget = Math.max(windTarget, 0.25);
    this.windGain.gain.cancelScheduledValues(t);
    this.windGain.gain.linearRampToValueAtTime(windTarget, t + ramp);

    // Wind filter sweep makes gusts feel textured.
    const freqTarget = 250 + Math.min(900, windSpeed * 18);
    this.windFilter.frequency.cancelScheduledValues(t);
    this.windFilter.frequency.linearRampToValueAtTime(freqTarget, t + ramp);

    // Rain volume.
    let rainTarget = 0;
    if (w.condition === "rain") rainTarget = 0.25;
    else if (w.condition === "storm") rainTarget = 0.4;
    else if (w.condition === "snow") rainTarget = 0.05; // faint hiss for snow
    this.rainGain.gain.cancelScheduledValues(t);
    this.rainGain.gain.linearRampToValueAtTime(rainTarget, t + ramp);

    // Night crickets — only in dark buckets, clear-ish weather.
    const nightFriendly = bucket === "night" &&
      (w.condition === "clear" || w.condition === "clouds");
    if (nightFriendly && !this.nightInterval) {
      this.nightInterval = setInterval(() => this._chirp(), 900);
    } else if (!nightFriendly && this.nightInterval) {
      clearInterval(this.nightInterval);
      this.nightInterval = null;
    }
    this.nightGain.gain.cancelScheduledValues(t);
    this.nightGain.gain.linearRampToValueAtTime(nightFriendly ? 0.35 : 0, t + ramp);
  }

  /** Play a thunder rumble. Called by the app when lightning fires. */
  thunder(intensity = 1) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;

    // Low rumble: filtered noise with quick attack, long decay.
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const lp = this.ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 200;
    lp.Q.value = 1;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    gain.gain.linearRampToValueAtTime(0.6 * intensity, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.01, t + 2.4);
    src.connect(lp); lp.connect(gain); gain.connect(this.master);
    src.start(t);
    src.stop(t + 2.6);

    // Crack: brief high-frequency burst.
    const crack = this.ctx.createBufferSource();
    crack.buffer = this.noiseBuffer;
    const hp = this.ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 3000;
    const cg = this.ctx.createGain();
    cg.gain.value = 0;
    cg.gain.linearRampToValueAtTime(0.4 * intensity, t + 0.02);
    cg.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    crack.connect(hp); hp.connect(cg); cg.connect(this.master);
    crack.start(t);
    crack.stop(t + 0.35);
  }

  _chirp() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + Math.random() * 0.5;
    const osc = this.ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = 4500 + Math.random() * 800;
    const g = this.ctx.createGain();
    g.gain.value = 0;
    // Quick rhythmic chirp: 3 pulses
    for (let i = 0; i < 3; i++) {
      const tt = t + i * 0.07;
      g.gain.setValueAtTime(0, tt);
      g.gain.linearRampToValueAtTime(0.08, tt + 0.005);
      g.gain.exponentialRampToValueAtTime(0.001, tt + 0.05);
    }
    osc.connect(g); g.connect(this.nightGain);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  _createNoiseBuffer() {
    const duration = 2.5;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Pink-ish noise via simple filter
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.099046;
      b1 = 0.96300 * b1 + white * 0.2965164;
      b2 = 0.57000 * b2 + white * 1.0526913;
      data[i] = (b0 + b1 + b2 + white * 0.1848) * 0.2;
    }
    return buffer;
  }
}
