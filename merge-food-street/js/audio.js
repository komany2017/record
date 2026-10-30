'use strict';
/* ============================================================
 * 音效引擎：WebAudio 合成音，无音频资源文件
 * ============================================================ */
let AC = null;
function ac() {
  if (!AC) AC = new (window.AudioContext || window.webkitAudioContext)();
  return AC;
}

function beep(f, d, type, v, at) {
  if (state && state.muted) return;
  try {
    const c = ac(), o = c.createOscillator(), g = c.createGain(), t0 = c.currentTime + (at || 0);
    o.type = type || 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(v || 0.12, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
    o.connect(g); g.connect(c.destination);
    o.start(t0); o.stop(t0 + d + 0.02);
  } catch (e) {}
}

const SFX = {
  merge() { beep(520, .07, 'triangle', .14); beep(780, .1, 'triangle', .12, .05); },
  spawn() { beep(300, .06, 'sine', .1); },
  coin()  { beep(880, .05, 'square', .05); beep(1320, .08, 'square', .045, .04); },
  error() { beep(160, .12, 'sawtooth', .07); },
  click() { beep(600, .03, 'sine', .05); },
  level() { beep(523, .09, 'triangle', .12); beep(659, .09, 'triangle', .12, .09); beep(784, .14, 'triangle', .12, .18); }
};
