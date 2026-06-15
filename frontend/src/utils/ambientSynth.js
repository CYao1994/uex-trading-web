const AudioContext = window.AudioContext || window.webkitAudioContext;

const CHORDS = [
  { name: 'Dm', notes: [146.8, 220], fifth: 880 },
  { name: 'Bb', notes: [116.5, 174.6], fifth: 698.5 },
  { name: 'F', notes: [87.3, 130.8], fifth: 523.3 },
  { name: 'C', notes: [65.4, 98], fifth: 392 },
];

class AmbientSynth {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this._started = false;
    this._disposed = false;
    this._oscillators = [];
    this._intervals = [];
    this._currentChord = 0;
  }

  start() {
    if (this._started || this._disposed) return;
    try {
      this.ctx = new AudioContext();
    } catch { return; }
    if (this.ctx.state === 'suspended') this.ctx.resume();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0;
    this.masterGain.connect(this.ctx.destination);

    this._buildDrone();
    this._buildOrgan();
    this._buildHarmonics();
    this._buildReverb();
    this._startChordLoop();

    this._started = true;
  }

  _buildDrone() {
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.06;
    gain.connect(this.masterGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 120;
    filter.Q.value = 1;
    filter.connect(gain);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.05;
    lfoGain.gain.value = 30;
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);
    lfo.start();
    this._oscillators.push(lfo);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.value = 55;
    osc1.connect(filter);
    osc1.start();
    this._oscillators.push(osc1);

    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'lowpass';
    filter2.frequency.value = 200;
    filter2.connect(gain);

    const osc2 = ctx.createOscillator();
    osc2.type = 'sine';
    osc2.frequency.value = 82.4;
    osc2.connect(filter2);
    osc2.start();
    this._oscillators.push(osc2);
  }

  _buildOrgan() {
    const ctx = this.ctx;
    this._organGain = ctx.createGain();
    this._organGain.gain.value = 0.1;
    this._organGain.connect(this.masterGain);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.7;
    filter.connect(this._organGain);

    this._organFilter = filter;

    this._organVoices = CHORDS.map(() => {
      const voiceGain = ctx.createGain();
      voiceGain.gain.value = 0;
      voiceGain.connect(filter);

      const vibrato = ctx.createOscillator();
      const vibratoGain = ctx.createGain();
      vibrato.type = 'sine';
      vibrato.frequency.value = 4;
      vibratoGain.gain.value = 3;
      vibrato.connect(vibratoGain);

      const oscs = [];
      CHORDS[0].notes.forEach((freq) => {
        for (let h = 0; h < 3; h++) {
          const osc = ctx.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = freq * (h + 1);
          const hGain = ctx.createGain();
          hGain.gain.value = h === 0 ? 1 : h === 1 ? 0.5 : 0.25;
          osc.connect(hGain);
          hGain.connect(voiceGain);
          vibratoGain.connect(osc.frequency);
          osc.start();
          oscs.push(osc);
        }
      });
      vibrato.start();
      this._oscillators.push(vibrato, ...oscs);

      return { gain: voiceGain, oscs };
    });
  }

  _buildHarmonics() {
    const ctx = this.ctx;
    this._harmonicsGain = ctx.createGain();
    this._harmonicsGain.gain.value = 0;
    this._harmonicsGain.connect(this.masterGain);

    const lfo = ctx.createOscillator();
    const lfoGain = ctx.createGain();
    lfo.type = 'sine';
    lfo.frequency.value = 0.1;
    lfoGain.gain.value = 0.015;
    lfo.connect(lfoGain);
    lfoGain.connect(this._harmonicsGain.gain);
    lfo.start();
    this._oscillators.push(lfo);

    this._harmonicOsc = ctx.createOscillator();
    this._harmonicOsc.type = 'sine';
    this._harmonicOsc.frequency.value = 880;
    this._harmonicOsc.connect(this._harmonicsGain);
    this._harmonicOsc.start();
    this._oscillators.push(this._harmonicOsc);
  }

  _buildReverb() {
    const ctx = this.ctx;
    const rate = ctx.sampleRate;
    const length = rate * 2.5;
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.5);
      }
    }
    this._convolver = ctx.createConvolver();
    this._convolver.buffer = impulse;

    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.15;
    this._convolver.connect(reverbGain);
    reverbGain.connect(this.masterGain);

    this._organGain.connect(this._convolver);
    this._organGain.connect(this.masterGain);
  }

  _startChordLoop() {
    const scheduleChord = () => {
      if (this._disposed) return;
      const ctx = this.ctx;
      const now = ctx.currentTime;
      const chord = CHORDS[this._currentChord % 4];

      this._organVoices.forEach((voice) => {
        const notes = chord.notes;
    voice.oscs.forEach((osc, _j) => {
        const noteIdx = Math.floor(_j / 3);
        const harmIdx = _j % 3;
          if (noteIdx < notes.length) {
            osc.frequency.setValueAtTime(notes[noteIdx] * (harmIdx + 1), now);
          }
        });
        voice.gain.gain.linearRampToValueAtTime(1, now + 1.5);
        setTimeout(() => {
          if (!this._disposed) {
            voice.gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.5);
          }
        }, 6500);
      });

      this._harmonicOsc.frequency.setValueAtTime(chord.fifth, now);

      this._currentChord++;
    };

    scheduleChord();
    const interval = setInterval(scheduleChord, 8000);
    this._intervals.push(interval);
  }

  stop() {
    if (!this._started || this._disposed) return;
    this.masterGain.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 1.5);
    setTimeout(() => this.dispose(), 1600);
  }

  setVolume(v) {
    if (!this.ctx || this._disposed) return;
    this.masterGain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.3);
  }

  dispose() {
    if (this._disposed) return;
    this._disposed = true;
    this._intervals.forEach(clearInterval);
    this._intervals = [];
    this._oscillators.forEach(o => {
      try { o.stop(); } catch { /* already stopped */ }
      try { o.disconnect(); } catch { /* already disconnected */ }
    });
    this._oscillators = [];
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close().catch(() => {});
    }
  }
}

const ambientSynth = new AmbientSynth();
export default ambientSynth;
