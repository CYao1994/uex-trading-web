import { Howl } from 'howler';

const SPRITE_MAP = {
  nav_click: [0, 200],
  page_transition: [200, 370],
  button_hover: [570, 100],
  button_click: [670, 200],
  toggle_on: [870, 180],
  toggle_off: [1050, 180],
  search_focus: [1230, 150],
  search_type: [1380, 60],
  search_clear: [1440, 300],
  filter_apply: [1740, 200],
  sort_change: [1940, 150],
  data_loading: [2090, 500],
  data_loaded: [2590, 350],
  data_error: [2940, 350],
  item_select: [3290, 200],
  detail_open: [3490, 330],
  detail_close: [3820, 280],
  favorite_add: [4100, 300],
  favorite_remove: [4400, 200],
  route_calculate: [4600, 700],
  route_found: [5300, 500],
  profit_highlight: [5800, 250],
  success: [6050, 400],
  warning: [6450, 350],
  notification: [6800, 300],
};

const VOLUME_MODIFIERS = {
  button_hover: 0.85,
  search_type: 0.75,
  nav_click: 1.0,
  button_click: 1.0,
  filter_apply: 1.0,
  sort_change: 1.0,
  item_select: 1.0,
  toggle_on: 1.0,
  toggle_off: 1.0,
  search_focus: 0.9,
  search_clear: 1.0,
  page_transition: 1.0,
  detail_open: 1.0,
  detail_close: 1.0,
  favorite_add: 1.0,
  favorite_remove: 1.0,
  route_calculate: 1.0,
  route_found: 1.0,
  data_loading: 1.0,
  data_loaded: 1.0,
  data_error: 1.0,
  profit_highlight: 1.0,
  success: 1.0,
  warning: 1.0,
  notification: 1.0,
};

class SoundManager {
  constructor() {
    this.enabled = true;
    this.volume = 0.85;
    this.sprite = null;
    this._ready = false;
    this._lastTypeTime = 0;
    this.ambientHowl = null;
    this.ambientVolume = 0.20;
    this._ambientReady = false;
    this._init();
  }

  _init() {
    const onFirstInteraction = () => {
      document.removeEventListener('click', onFirstInteraction);
      document.removeEventListener('keydown', onFirstInteraction);
      this._loadSprite();
      if (this.enabled) this._loadAmbient();
    };
    document.addEventListener('click', onFirstInteraction, { once: true });
    document.addEventListener('keydown', onFirstInteraction, { once: true });
  }

  _loadSprite() {
    if (this.sprite) return;
    try {
      this.sprite = new Howl({
        src: ['/sfx/sprite.mp3'],
        sprite: SPRITE_MAP,
        volume: this.volume,
        preload: true,
        onload: () => { this._ready = true; },
        onloaderror: () => {},
      });
    } catch { /* howler init failed */ }
  }

  _loadAmbient() {
    if (this.ambientHowl) {
      if (!this.ambientHowl.playing()) {
        this.ambientHowl.play();
        this.ambientHowl.fade(0, this.ambientVolume, 2000);
      }
      return;
    }
    this.ambientHowl = new Howl({
      src: ['/sfx/ambient-space.mp3'],
      loop: true,
      volume: 0,
      preload: true,
      onload: () => {
        this._ambientReady = true;
        if (this.enabled) {
          this.ambientHowl.play();
          this.ambientHowl.fade(0, this.ambientVolume, 2000);
        }
      },
      onloaderror: () => {},
    });
  }

  _playAmbient() {
    if (!this._ambientReady) {
      this._loadAmbient();
      return;
    }
    if (this.ambientHowl && !this.ambientHowl.playing()) {
      this.ambientHowl.play();
      this.ambientHowl.fade(0, this.ambientVolume, 2000);
    }
  }

  _stopAmbient() {
    if (this.ambientHowl && this.ambientHowl.playing()) {
      this.ambientHowl.fade(this.ambientVolume, 0, 1500);
      setTimeout(() => { try { this.ambientHowl?.pause(); } catch { /* ignore */ } }, 1500);
    }
  }

  play(name) {
    if (!this.enabled || !this._ready) return;
    if (!SPRITE_MAP[name]) return;
    if (name === 'search_type') {
      const now = Date.now();
      if (now - this._lastTypeTime < 100) return;
      this._lastTypeTime = now;
    }
    const modifier = VOLUME_MODIFIERS[name] ?? 1.0;
    this.sprite.volume(this.volume * modifier);
    this.sprite.play(name);
  }

  setEnabled(on) {
    this.enabled = on;
    localStorage.setItem('sfx_enabled', on);
    if (on) {
      this._playAmbient();
    } else {
      this._stopAmbient();
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(1, v));
    localStorage.setItem('sfx_volume', this.volume);
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  restore() {
    const en = localStorage.getItem('sfx_enabled');
    const vol = localStorage.getItem('sfx_volume');
    if (en !== null) this.enabled = en === 'true';
    if (vol !== null) this.volume = parseFloat(vol);
  }
}

const soundManager = new SoundManager();
soundManager.restore();

export default soundManager;
