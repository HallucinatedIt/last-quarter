'use strict';
// LAST QUARTER - core: screen, font, input, audio
const W = 384, H = 224, GROUND = 200, STAGE_W = 640, CAM_MAX = STAGE_W - W;
const cv = document.getElementById('screen');
const ctx = cv.getContext('2d');
ctx.imageSmoothingEnabled = false;

function mkc(w, h) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x];
}
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const sgn = v => v < 0 ? -1 : 1;
function srand(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function R(c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); }
function hex(h) { return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]; }
function mixc(a, b, t) { const p = hex(a), q = hex(b); return 'rgb(' + p.map((v, i) => Math.round(v + (q[i] - v) * t)).join(',') + ')'; }
function shade(h, k) { const p = hex(h); return 'rgb(' + p.map(v => Math.round(v * k)).join(',') + ')'; }

// ---------- 5x7 bitmap font ----------
const FONT = {
  A: [14, 17, 17, 31, 17, 17, 17], B: [30, 17, 17, 30, 17, 17, 30], C: [14, 17, 16, 16, 16, 17, 14], D: [30, 17, 17, 17, 17, 17, 30],
  E: [31, 16, 16, 30, 16, 16, 31], F: [31, 16, 16, 30, 16, 16, 16], G: [14, 17, 16, 23, 17, 17, 15], H: [17, 17, 17, 31, 17, 17, 17],
  I: [14, 4, 4, 4, 4, 4, 14], J: [7, 2, 2, 2, 2, 18, 12], K: [17, 18, 20, 24, 20, 18, 17], L: [16, 16, 16, 16, 16, 16, 31],
  M: [17, 27, 21, 21, 17, 17, 17], N: [17, 25, 21, 19, 17, 17, 17], O: [14, 17, 17, 17, 17, 17, 14], P: [30, 17, 17, 30, 16, 16, 16],
  Q: [14, 17, 17, 17, 21, 18, 13], R: [30, 17, 17, 30, 20, 18, 17], S: [15, 16, 16, 14, 1, 1, 30], T: [31, 4, 4, 4, 4, 4, 4],
  U: [17, 17, 17, 17, 17, 17, 14], V: [17, 17, 17, 17, 17, 10, 4], W: [17, 17, 17, 21, 21, 27, 17], X: [17, 17, 10, 4, 10, 17, 17],
  Y: [17, 17, 10, 4, 4, 4, 4], Z: [31, 1, 2, 4, 8, 16, 31],
  0: [14, 17, 19, 21, 25, 17, 14], 1: [4, 12, 4, 4, 4, 4, 14], 2: [14, 17, 1, 2, 4, 8, 31], 3: [30, 1, 1, 14, 1, 1, 30],
  4: [2, 6, 10, 18, 31, 2, 2], 5: [31, 16, 30, 1, 1, 17, 14], 6: [6, 8, 16, 30, 17, 17, 14], 7: [31, 1, 2, 4, 8, 8, 8],
  8: [14, 17, 17, 14, 17, 17, 14], 9: [14, 17, 17, 15, 1, 2, 12],
  '.': [0, 0, 0, 0, 0, 12, 12], ',': [0, 0, 0, 0, 12, 4, 8], '!': [4, 4, 4, 4, 4, 0, 4], '?': [14, 17, 1, 2, 4, 0, 4],
  '-': [0, 0, 0, 31, 0, 0, 0], '+': [0, 4, 4, 31, 4, 4, 0], ':': [0, 12, 12, 0, 12, 12, 0], "'": [4, 4, 8, 0, 0, 0, 0],
  '/': [1, 1, 2, 4, 8, 16, 16], '(': [2, 4, 8, 8, 8, 4, 2], ')': [8, 4, 2, 2, 2, 4, 8], '=': [0, 0, 31, 0, 31, 0, 0],
  '>': [8, 4, 2, 1, 2, 4, 8], '<': [2, 4, 8, 16, 8, 4, 2], '*': [0, 21, 14, 31, 14, 21, 0]
};
function tw(s, sc = 1) { return String(s).length * 6 * sc - sc; }
// al: 0 left, 1 center, 2 right. col may be a function(row) for gradients. sh = shadow colour.
function text(c, s, x, y, col, sc = 1, al = 0, sh) {
  s = String(s);
  if (al) x -= al === 1 ? Math.floor(tw(s, sc) / 2) : tw(s, sc);
  if (sh) text(c, s, x + sc, y + sc, sh, sc);
  for (let i = 0; i < s.length; i++) {
    const g = FONT[s[i]];
    if (g) for (let r = 0; r < 7; r++) {
      const row = g[r]; if (!row) continue;
      c.fillStyle = typeof col === 'function' ? col(r) : col;
      for (let b = 0; b < 5; b++) if (row & (16 >> b)) c.fillRect(x + b * sc, y + r * sc, sc, sc);
    }
    x += 6 * sc;
  }
}
function wrap(s, n) {
  const out = []; let line = '';
  for (const w of s.split(' ')) { if ((line + ' ' + w).trim().length > n) { out.push(line); line = w; } else line = (line + ' ' + w).trim(); }
  if (line) out.push(line); return out;
}

// ---------- input: 8-way stick + 6 buttons per player ----------
const B = { U: 1, D: 2, L: 4, R: 8, LP: 16, MP: 32, HP: 64, LK: 128, MK: 256, HK: 512, ST: 1024, CO: 2048 };
const PUNCH = 112, KICK = 896, ATK = 1008;
const LAYOUTS = {
  std: [
    { KeyW: 1, KeyS: 2, KeyA: 4, KeyD: 8, KeyU: 16, KeyI: 32, KeyO: 64, KeyJ: 128, KeyK: 256, KeyL: 512, Digit1: 1024, Digit5: 2048 },
    { ArrowUp: 1, ArrowDown: 2, ArrowLeft: 4, ArrowRight: 8, Numpad4: 16, Numpad5: 32, Numpad6: 64, Numpad1: 128, Numpad2: 256, Numpad3: 512, Digit2: 1024, Digit6: 2048 }
  ],
  shared: [
    { KeyW: 1, KeyS: 2, KeyA: 4, KeyD: 8, KeyR: 16, KeyT: 32, KeyY: 64, KeyF: 128, KeyG: 256, KeyH: 512, Digit1: 1024, Digit5: 2048 },
    { ArrowUp: 1, ArrowDown: 2, ArrowLeft: 4, ArrowRight: 8, KeyI: 16, KeyO: 32, KeyP: 64, KeyK: 128, KeyL: 256, Semicolon: 512, Digit2: 1024, Digit6: 2048 }
  ]
};
let layout = 'std';
const keyState = [0, 0], virt = [0, 0], padState = [0, 0];
let muted = false;
window.addEventListener('keydown', e => {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.code === 'KeyM') { muted = !muted; if (typeof syncUi === 'function') syncUi(); return; }
  let hit = false;
  for (let p = 0; p < 2; p++) { const b = LAYOUTS[layout][p][e.code]; if (b) { keyState[p] |= b; hit = true; } }
  if (e.code === 'Enter') { keyState[0] |= B.ST; hit = true; }
  if (hit) { e.preventDefault(); audioInit(); }
});
window.addEventListener('keyup', e => {
  for (let p = 0; p < 2; p++) { const b = LAYOUTS[layout][p][e.code]; if (b) keyState[p] &= ~b; }
  if (e.code === 'Enter') keyState[0] &= ~B.ST;
});
window.addEventListener('blur', () => { keyState[0] = keyState[1] = 0; virt[0] = virt[1] = 0; });

// Arcade sticks and gamepads: first pad is P1, second is P2.
function pollPads() {
  padState[0] = padState[1] = 0;
  let pads; try { pads = navigator.getGamepads ? navigator.getGamepads() : []; } catch (e) { return; }
  let n = 0;
  for (const g of pads) {
    if (!g || !g.connected || n > 1) continue;
    let s = 0; const bt = i => g.buttons[i] && g.buttons[i].pressed;
    const ax = g.axes[0] || 0, ay = g.axes[1] || 0;
    if (ay < -0.5 || bt(12)) s |= B.U; if (ay > 0.5 || bt(13)) s |= B.D;
    if (ax < -0.5 || bt(14)) s |= B.L; if (ax > 0.5 || bt(15)) s |= B.R;
    if (bt(2)) s |= B.LP; if (bt(3)) s |= B.MP; if (bt(5)) s |= B.HP;
    if (bt(0)) s |= B.LK; if (bt(1)) s |= B.MK; if (bt(7)) s |= B.HK;
    if (bt(9)) s |= B.ST; if (bt(8)) s |= B.CO;
    if (s) audioInit();
    padState[n++] = s;
  }
}
function readInput(p) {
  let s = keyState[p] | virt[p] | padState[p];
  if ((s & 12) === 12) s &= ~12;          // left+right cancels
  if ((s & 3) === 3) s &= ~2;             // up+down gives up
  return s;
}

// ---------- audio: synthesised chip sounds ----------
let AC = null, master = null, noiseBuf = null;
function audioInit() {
  if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
  try {
    const Ctor = window.AudioContext || window.webkitAudioContext; if (!Ctor) return;
    AC = new Ctor(); master = AC.createGain(); master.gain.value = 0.45; master.connect(AC.destination);
    noiseBuf = AC.createBuffer(1, AC.sampleRate, AC.sampleRate);
    const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch (e) { AC = null; }
}
function tone(type, f0, f1, dur, vol, delay = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime + delay, o = AC.createOscillator(), g = AC.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function noise(dur, vol, f0, f1, delay = 0) {
  if (!AC || muted) return;
  const t = AC.currentTime + delay, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = noiseBuf; s.loop = true; fl.type = 'bandpass'; fl.Q.value = 0.8;
  fl.frequency.setValueAtTime(f0, t); fl.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  s.connect(fl); fl.connect(g); g.connect(master); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
const SFX = {
  hitL() { noise(.06, .5, 1800, 500); tone('square', 240, 110, .06, .2); },
  hitM() { noise(.09, .6, 1400, 300); tone('square', 190, 80, .09, .25); },
  hitH() { noise(.16, .8, 1100, 120); tone('square', 150, 45, .16, .32); },
  block() { noise(.05, .3, 3200, 2200); tone('triangle', 520, 320, .05, .2); },
  gun() { noise(.11, .8, 2600, 160); tone('square', 150, 50, .09, .3); },
  pistol() { noise(.09, .8, 3600, 300); tone('square', 260, 70, .07, .3); },
  zap() { tone('sawtooth', 1500, 180, .18, .22); noise(.14, .22, 6000, 2400); },
  thunder() { noise(.7, .8, 900, 50); tone('sawtooth', 90, 30, .5, .3); },
  jump() { tone('square', 210, 520, .1, .1); },
  whoosh() { noise(.12, .18, 700, 2600); },
  coin() { tone('square', 988, 988, .08, .28); tone('square', 1319, 1319, .32, .28, .08); },
  sel() { tone('square', 660, 660, .05, .18); },
  ok() { tone('square', 523, 1046, .16, .25); },
  ko() { tone('sawtooth', 420, 40, .9, .35); noise(.5, .5, 1000, 80); },
  land() { noise(.07, .3, 320, 90); },
  super() { tone('sawtooth', 180, 1700, .5, .28); tone('square', 90, 850, .5, .15); },
  crunch() { noise(.22, .6, 2600, 500); },
  charge() { tone('square', 320, 960, .2, .14); },
  round() { tone('square', 392, 392, .12, .22); tone('square', 523, 523, .12, .22, .13); tone('square', 784, 784, .3, .22, .26); },
  tick() { tone('square', 880, 880, .04, .15); }
};
function sfx(n) {
  if (!AC || muted || !SFX[n]) return;
  if (typeof G !== 'undefined' && G.mode === 'demo' && G.scene === 'fight' && n !== 'coin') return;   // attract mode stays quiet
  SFX[n]();
}

// tiny step sequencer for stage music
const MUS = { t: 0, step: 0 };
const nf = n => 220 * Math.pow(2, n / 12);
function musicTick(m) {
  if (!AC || muted || !m) return;
  if (++MUS.t < m.spd) return; MUS.t = 0;
  const s = MUS.step++ % 32;
  const b = m.bass[s % m.bass.length]; if (b != null) tone('triangle', nf(m.root + b - 24), nf(m.root + b - 24), .17, .3);
  const l = m.lead[s % m.lead.length]; if (l != null) tone('square', nf(m.root + l), nf(m.root + l), .1, .05);
  if (s % 4 === 2) noise(.03, .07, 7000, 5000);
  if (s % 8 === 0) tone('sine', 130, 40, .1, .32);
  if (s % 8 === 4) noise(.07, .12, 1800, 900);
}
