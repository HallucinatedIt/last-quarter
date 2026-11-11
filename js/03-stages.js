'use strict';
// LAST QUARTER - five arenas, painted once into parallax layers
const FLOOR_W = 900, FLOOR_Y = 176, FLOOR_H = H - FLOOR_Y;
const fscale = v => 0.76 + 0.01 * v;

function skyGrad(c, w, h, cols) {
  const n = cols.length, bh = h / n;
  for (let i = 0; i < n; i++) {
    R(c, 0, i * bh, w, bh + 1, cols[i]);
    if (i > 0) { c.fillStyle = cols[i]; for (let y = 0; y < 4; y++) { const yy = Math.floor(i * bh) - 4 + y; for (let x = y & 1; x < w; x += y < 2 ? 4 : 2) c.fillRect(x, yy, 1, 1); } }
  }
}
function disc(c, cx, cy, r, col) { c.fillStyle = col; for (let y = -r; y <= r; y++) { const w = Math.floor(Math.sqrt(r * r - y * y)); c.fillRect(cx - w, cy + y, w * 2 + 1, 1); } }
function floorTex(o) {
  const [cvs, c] = mkc(FLOOR_W, FLOOR_H), vp = FLOOR_W / 2;
  for (let v = 0; v < FLOOR_H; v++) {
    const s = fscale(v), base = mixc(o.c0, o.c1, v / (FLOOR_H - 1));
    R(c, 0, v, FLOOR_W, 1, base);
    if (o.checker) {
      const band = Math.floor(Math.pow(v / FLOOR_H, 0.7) * 5), tws = o.tw * s;
      for (let k = -14; k < 14; k++) if ((k + band) & 1) R(c, vp + k * tws, v, tws + 1, 1, mixc(o.checker, '#000000', 0.25 * (1 - v / FLOOR_H)));
    }
  }
  if (!o.checker) {
    for (let k = -14; k <= 14; k++) stamp(c, vp + k * o.tw * fscale(0), 0, vp + k * o.tw * fscale(FLOOR_H - 1), FLOOR_H - 1, 1, o.line);
    for (const v of [0, 4, 10, 19, 31, 46]) R(c, 0, v, FLOOR_W, 1, o.line);
  }
  R(c, 0, 0, FLOOR_W, 1, o.edge || o.line);
  if (o.deco) o.deco(c, vp);
  return cvs;
}
function drawFloor(c, tex, cam) {
  for (let v = 0; v < FLOOR_H; v++) {
    const sx = Math.round(FLOOR_W / 2 - W / 2 + (cam - CAM_MAX / 2) * fscale(v));
    c.drawImage(tex, sx, v, W, 1, 0, FLOOR_Y + v, W, 1);
  }
}

const STAGES = [
  {
    name: 'STORMFRONT ROOF', mus: { root: 0, spd: 7, bass: [0, null, 0, 0, null, 0, 3, null, 5, null, 5, 5, null, 3, 0, null], lead: [12, null, 15, null, 19, null, 15, 12, null, 10, null, 12, null, null, 7, null] },
    build() {
      const [far, f] = mkc(448, 180), [mid, m] = mkc(540, 180), r = srand(7);
      skyGrad(f, 448, 180, ['#0a0c24', '#12143a', '#1c1a52', '#2a2068', '#3a2a78']);
      for (let i = 0; i < 9; i++) R(f, r() * 448, 16 + r() * 60, 40 + r() * 50, 5, '#191a48');
      for (let x = 0; x < 448;) {
        const w = 14 + (r() * 22 | 0), h = 40 + (r() * 90 | 0); R(f, x, 180 - h, w, h, '#0f1232'); R(f, x, 180 - h, 1, h, '#1a1e48');
        for (let yy = 180 - h + 4; yy < 176; yy += 6) for (let xx = x + 3; xx < x + w - 3; xx += 5) if (r() < 0.28) R(f, xx, yy, 2, 3, r() < 0.8 ? '#ffd866' : '#6ee7ff');
        x += w + 1 + (r() * 6 | 0);
      }
      R(m, 0, 150, 540, 30, '#232847'); R(m, 0, 150, 540, 3, '#3c4270'); for (let x = 0; x < 540; x += 36) R(m, x, 153, 1, 27, '#1a1e3a');
      R(m, 62, 112, 3, 40, '#1a1e3a'); R(m, 98, 112, 3, 40, '#1a1e3a'); R(m, 62, 130, 39, 2, '#1a1e3a');
      R(m, 54, 74, 54, 40, '#3a3350'); R(m, 54, 74, 54, 3, '#544a70'); R(m, 54, 92, 54, 2, '#2a2440'); R(m, 58, 68, 46, 6, '#2a2440'); R(m, 70, 62, 22, 6, '#2a2440');
      R(m, 188, 126, 48, 24, '#4a5078'); R(m, 188, 126, 48, 2, '#6a70a0'); for (let x = 192; x < 232; x += 4) R(m, x, 132, 2, 14, '#2c3158');
      R(m, 300, 110, 4, 40, '#1a1e3a'); R(m, 396, 110, 4, 40, '#1a1e3a');
      R(m, 286, 56, 128, 56, '#6ee7ff'); R(m, 288, 58, 124, 52, '#10122c');
      text(m, 'HI-VOLT', 350, 66, '#6ee7ff', 2, 1); text(m, 'POWER AND LIGHT', 350, 88, '#ffe94a', 1, 1); R(m, 300, 100, 100, 1, '#ff4a8a');
      R(m, 470, 36, 2, 114, '#555a80'); R(m, 462, 60, 18, 1, '#555a80'); R(m, 465, 80, 12, 1, '#555a80');
      return { far, mid, floor: floorTex({ c0: '#3b4268', c1: '#262b48', line: '#1d2140', edge: '#565d8c', tw: 48 }) };
    },
    anim(c, cam, t) {
      if (t % 420 < 3 || (t % 420 > 8 && t % 420 < 11)) { c.globalAlpha = 0.3; R(c, 0, 0, W, FLOOR_Y, '#dfe8ff'); c.globalAlpha = 1; }
      if ((t >> 5) & 1) R(c, 470 - cam * 0.6 - 1, 33, 4, 4, '#ff3030');
      c.fillStyle = '#8fa8ff'; c.globalAlpha = 0.5;
      for (let i = 0; i < 46; i++) c.fillRect((i * 53 + t * 2 + cam) % (W + 20) - 10 - (((i * 37 + t * 9) % H) >> 3), (i * 37 + t * 9) % H, 1, 5);
      c.globalAlpha = 1;
    }
  },
  {
    name: 'DEADEYE RANGE', mus: { root: -2, spd: 8, bass: [0, 0, null, 0, null, null, 7, null, 5, 5, null, 5, null, 3, null, 3], lead: [null, 12, null, 12, 14, null, 15, null, 14, null, 12, null, 10, null, 7, null] },
    build() {
      const [far, f] = mkc(448, 180), [mid, m] = mkc(540, 180), r = srand(21);
      skyGrad(f, 448, 180, ['#3a2a6b', '#6b3270', '#a8405c', '#d9603b', '#f2a343', '#f7d67a']);
      disc(f, 300, 158, 34, '#fff3b0'); disc(f, 300, 158, 28, '#ffffff');
      for (let i = 0; i < 6; i++) { const x = i * 84 + r() * 30, w = 50 + r() * 50, h = 22 + r() * 34; R(f, x, 180 - h, w, h, '#5b2e4a'); R(f, x + 6, 180 - h - 6, w - 18, 6, '#5b2e4a'); R(f, x, 180 - h, w, 2, '#7a3c58'); }
      R(f, 0, 170, 448, 10, '#8a4a4a');
      // target lane
      for (let i = 0; i < 5; i++) {
        const x = 60 + i * 104; R(m, x - 1, 96, 3, 60, '#5a3a1e'); R(m, x - 14, 94, 29, 3, '#5a3a1e');
        if (i % 2) { R(m, x - 9, 100, 19, 30, '#1c1c1c'); R(m, x - 5, 92, 11, 10, '#1c1c1c'); R(m, x - 3, 108, 7, 8, '#f4f4f0'); R(m, x - 1, 110, 3, 3, '#d02a2a'); }
        else { disc(m, x, 114, 13, '#f4f4f0'); disc(m, x, 114, 10, '#d02a2a'); disc(m, x, 114, 7, '#f4f4f0'); disc(m, x, 114, 4, '#d02a2a'); disc(m, x, 114, 1, '#1c1c1c'); }
      }
      R(m, 0, 164, 540, 16, '#6e4a2a');
      for (let row = 0; row < 3; row++) for (let x = -10 + row * 9; x < 540; x += 22) { const y = 138 + row * 13; R(m, x, y, 21, 12, '#5a3c20'); R(m, x + 1, y + 1, 19, 10, '#c9a46a'); R(m, x + 2, y + 2, 16, 2, '#e0bf86'); R(m, x + 10, y + 1, 1, 10, '#a88450'); }
      R(m, 452, 30, 4, 110, '#3b2a1a'); R(m, 492, 30, 4, 110, '#3b2a1a'); R(m, 444, 56, 60, 30, '#5a3c20'); R(m, 446, 62, 56, 12, '#1c1410'); R(m, 440, 48, 68, 8, '#3b2a1a');
      R(m, 6, 70, 3, 70, '#3b2a1a'); R(m, 0, 76, 44, 22, '#1c1c1c'); R(m, 1, 77, 42, 20, '#f2c230'); text(m, 'RANGE', 22, 79, '#1c1c1c', 1, 1); text(m, 'HOT', 22, 88, '#d02a2a', 1, 1);
      return { far, mid, floor: floorTex({ c0: '#c9975a', c1: '#9a6a3c', line: '#84572f', edge: '#e6c07e', tw: 60 }) };
    },
    anim(c, cam, t) {
      const fx = 474 - cam * 0.6, w = (t >> 3) % 3;
      R(c, fx, 6, 2, 26, '#3b2a1a'); R(c, fx + 2, 7 + w, 9, 7, '#d02a2a'); R(c, fx + 11, 8 + ((w + 1) % 3), 7, 6, '#d02a2a');
      c.fillStyle = '#f7d67a'; c.globalAlpha = 0.5;
      for (let i = 0; i < 16; i++) c.fillRect((i * 71 + t * 0.7 + cam * 0.4) % W, 120 + (i * 29 + Math.floor(t / 6)) % 70, 1, 1);
      c.globalAlpha = 1;
    }
  },
  {
    name: 'TWIN LANTERN DOJO', mus: { root: 3, spd: 6, bass: [0, null, 7, null, 0, null, 7, 5, 3, null, 7, null, 3, null, 5, 7], lead: [12, 14, null, 12, 14, null, 19, null, 17, 14, null, 17, 14, null, 12, null] },
    build() {
      const [far, f] = mkc(448, 180), [mid, m] = mkc(540, 180), r = srand(4);
      skyGrad(f, 448, 180, ['#1d2b53', '#3b3f7a', '#7e4b8a', '#d2738a', '#f5b08a']);
      disc(f, 110, 46, 15, '#fff0d8'); disc(f, 150, 60, 9, '#ffd8c0');
      const mtn = (cx, h, w, col, cap) => { for (let y = 0; y < h; y++) { const ww = w * (y / h); R(f, cx - ww, 180 - h + y, ww * 2, 1, y < h * 0.2 ? cap : col); } };
      mtn(90, 100, 110, '#3d3566', '#b9a8d8'); mtn(260, 130, 150, '#2f2f5e', '#c8bfe6'); mtn(400, 90, 110, '#3d3566', '#b9a8d8'); mtn(180, 60, 100, '#4a3a70', '#4a3a70');
      // hall
      R(m, 40, 70, 460, 110, '#5a2a22'); R(m, 40, 70, 460, 4, '#3a1814');
      for (let y = 0; y < 22; y++) R(m, 20 - y * 1.2 + (y > 17 ? -(y - 17) * 3 : 0), 48 + y, 500 + y * 2.4 + (y > 17 ? (y - 17) * 6 : 0), 1, y < 3 ? '#1c1a2a' : y % 4 === 0 ? '#2a2638' : '#35304a');
      for (let x = 60; x < 500; x += 88) { R(m, x, 74, 10, 106, '#a82c2c'); R(m, x, 74, 2, 106, '#d04a3a'); R(m, x - 3, 74, 16, 5, '#3a1814'); }
      for (let x = 74; x < 480; x += 88) { R(m, x, 92, 70, 78, '#e8dcc0'); for (let i = 1; i < 4; i++) R(m, x + i * 17.5, 92, 1, 78, '#8a6a4a'); for (let i = 1; i < 4; i++) R(m, x, 92 + i * 19.5, 70, 1, '#8a6a4a'); }
      R(m, 40, 170, 460, 10, '#3a1814');
      for (const x of [196, 344]) { R(m, x - 9, 80, 18, 62, '#1c1a2a'); R(m, x - 8, 81, 16, 60, '#a81c2c'); R(m, x - 2, 92, 2, 34, '#f1ead8'); R(m, x + 2, 92, 2, 34, '#f1ead8'); }
      for (const x of [150, 390]) { R(m, x, 70, 1, 16, '#1c1a2a'); R(m, x - 8, 86, 17, 22, '#1c1a2a'); R(m, x - 7, 87, 15, 20, '#ffb347'); R(m, x - 7, 87, 15, 2, '#c0392b'); R(m, x - 7, 105, 15, 2, '#c0392b'); R(m, x - 3, 91, 7, 12, '#ffe9a8'); }
      return { far, mid, floor: floorTex({ c0: '#9a6540', c1: '#5e3b26', line: '#4a2c1a', edge: '#c08a5a', tw: 40 }) };
    },
    anim(c, cam, t) {
      for (const x of [150, 390]) { const sx = x - cam * 0.6, g = 0.12 + 0.06 * Math.sin(t / 9 + x); c.globalAlpha = g; disc(c, Math.round(sx), 97, 24, '#ffb347'); c.globalAlpha = g * 1.6; disc(c, Math.round(sx), 97, 14, '#ffe9a8'); c.globalAlpha = 1; }
      c.fillStyle = '#ffb7c5';
      for (let i = 0; i < 14; i++) { const y = (i * 43 + t * 0.6) % H; c.fillRect((i * 67 + Math.sin(t / 30 + i) * 14 + cam * 0.3 + y * 0.4) % W, y, 2, 1); }
    }
  },
  {
    name: 'MIDNIGHT DONUTS', mus: { root: -4, spd: 8, bass: [0, null, null, 0, 3, null, 0, null, 5, null, null, 5, 7, null, 5, null], lead: [null, null, 12, null, 15, 12, null, 10, null, null, 7, null, 10, 12, null, null] },
    build() {
      const [far, f] = mkc(448, 180), [mid, m] = mkc(540, 180), r = srand(12);
      skyGrad(f, 448, 180, ['#070a1c', '#0d1230', '#141b44', '#1d2550']);
      for (let i = 0; i < 70; i++) R(f, r() * 448, r() * 120, 1, 1, r() < 0.2 ? '#fff' : '#8f9ad0');
      for (let x = 0; x < 448; x += 3) R(f, x, 156 - Math.sin(x / 60) * 8 - Math.sin(x / 23) * 3, 3, 30, '#0a0e26');
      for (let x = 10; x < 448; x += 46) { R(f, x, 132, 2, 30, '#141a3a'); R(f, x - 6, 134, 14, 1, '#141a3a'); }
      for (let x = 0; x < 448; x += 9) R(f, x, 166, 2, 1, x % 27 ? '#ffd866' : '#ff5a5a');
      // shop
      R(m, 150, 78, 250, 102, '#0c0c18'); R(m, 152, 80, 246, 100, '#e8dcc8'); R(m, 152, 80, 246, 6, '#ff7ac0'); R(m, 152, 150, 246, 30, '#c8b8a0');
      for (let x = 152; x < 398; x += 16) R(m, x, 86, 8, 8, '#2fd6c8'); for (let x = 160; x < 398; x += 16) R(m, x, 86, 8, 8, '#ff7ac0');
      for (const x of [162, 244]) { R(m, x, 100, 72, 46, '#0c0c18'); R(m, x + 2, 102, 68, 42, '#ffe9a8'); R(m, x + 2, 130, 68, 14, '#d9a05a'); R(m, x + 35, 102, 1, 42, '#0c0c18'); for (let i = 0; i < 5; i++) drawDonut(m, x + 10 + i * 12, 126, 4, i); R(m, x + 46, 108, 8, 22, '#3a2a4a'); R(m, x + 47, 102, 6, 7, '#3a2a4a'); }
      R(m, 334, 104, 40, 76, '#0c0c18'); R(m, 336, 106, 36, 74, '#8fd8e8'); R(m, 354, 106, 1, 74, '#0c0c18'); R(m, 340, 120, 10, 14, '#d02a2a'); text(m, 'OPEN', 345, 112, '#fff', 1, 1);
      R(m, 180, 30, 6, 50, '#3a3a48'); drawDonut(m, 183, 28, 24, 0.4);
      R(m, 214, 40, 172, 34, '#0c0c18'); R(m, 216, 42, 168, 30, '#1a1030'); text(m, 'MIDNIGHT', 300, 45, '#ff7ac0', 2, 1); text(m, 'DONUTS  OPEN 24H', 300, 62, '#2fd6c8', 1, 1);
      // car
      R(m, 20, 150, 100, 20, '#0c0c18'); R(m, 21, 151, 98, 18, '#7a2030'); R(m, 40, 134, 56, 18, '#0c0c18'); R(m, 42, 136, 52, 16, '#7a2030'); R(m, 46, 139, 20, 11, '#8fd8e8'); R(m, 70, 139, 20, 11, '#8fd8e8');
      disc(m, 42, 171, 8, '#0c0c18'); disc(m, 42, 171, 4, '#888'); disc(m, 98, 171, 8, '#0c0c18'); disc(m, 98, 171, 4, '#888'); R(m, 116, 156, 4, 4, '#ffe94a'); R(m, 20, 156, 3, 4, '#ff3030');
      R(m, 470, 50, 4, 130, '#2a2a36'); R(m, 452, 48, 24, 4, '#2a2a36'); R(m, 450, 52, 12, 3, '#fff3b0');
      return { far, mid, floor: floorTex({ c0: '#3a3a48', c1: '#22222c', line: '#c8b040', edge: '#6a6a7a', tw: 70 }) };
    },
    anim(c, cam, t) {
      const sx = 216 - cam * 0.6; if (t % 190 > 180 || t % 190 === 170) { c.globalAlpha = 0.7; R(c, sx, 42, 168, 18, '#1a1030'); c.globalAlpha = 1; }
      const lx = Math.round(456 - cam * 0.6); c.globalAlpha = 0.1; for (let i = 0; i < 6; i++) R(c, lx - 4 - i * 5, 55 + i * 20, 12 + i * 10, 20, '#fff3b0'); c.globalAlpha = 1;
      c.fillStyle = '#fff'; for (let i = 0; i < 3; i++) c.fillRect(lx + Math.sin(t / 7 + i * 2) * 9, 60 + Math.cos(t / 5 + i) * 6, 1, 1);
    }
  },
  {
    name: 'QUARTER PALACE', mus: { root: 2, spd: 6, bass: [0, 0, 12, 0, 0, 12, 0, 10, 3, 3, 15, 3, 5, 5, 17, 7], lead: [12, null, 12, 15, null, 12, 17, null, 15, null, 12, null, 10, 12, null, 19] },
    build() {
      const [far, f] = mkc(448, 180), [mid, m] = mkc(540, 180), r = srand(31);
      R(f, 0, 0, 448, 180, '#1a0f33'); R(f, 0, 0, 448, 14, '#0c0718');
      const pc = ['#ff3d6e', '#2fd6e8', '#ffc93a', '#7a4dff'];
      for (let i = 0; i < 70; i++) { const x = r() * 448, y = 18 + r() * 110, k = r() * 3 | 0, col = pc[r() * 4 | 0]; if (k === 0) { for (let j = 0; j < 6; j++) R(f, x + j, y + j, 6 - j, 1, col); } else if (k === 1) { for (let j = 0; j < 5; j++) R(f, x + j * 3, y + (j % 2) * 3, 3, 2, col); } else { R(f, x, y, 5, 5, col); R(f, x + 1, y + 1, 3, 3, '#1a0f33'); } }
      R(f, 0, 130, 448, 3, '#2fd6e8'); R(f, 0, 136, 448, 2, '#ff3d6e'); R(f, 0, 140, 448, 40, '#120a26');
      const cols = ['#2a3a8a', '#8a2a4a', '#2a7a6a', '#6a3a9a', '#8a6a2a', '#3a3a4a', '#9a3a2a', '#2a5a9a', '#5a2a7a', '#2a8a4a', '#8a2a6a', '#3a6a8a'];
      for (let i = 0; i < 12; i++) {
        const x = 8 + i * 44, col = cols[i];
        R(m, x - 1, 67, 38, 113, '#0c0718'); R(m, x, 68, 36, 112, col); R(m, x, 68, 3, 112, shade(col, 0.7));
        R(m, x + 2, 70, 32, 12, '#0c0718'); R(m, x + 3, 71, 30, 10, pc[i % 4]); R(m, x + 6, 74, 24, 4, '#fff');
        R(m, x + 4, 86, 28, 28, '#0c0718'); R(m, x + 6, 88, 24, 24, '#10182a');
        R(m, x - 2, 118, 40, 9, '#0c0718'); R(m, x - 1, 119, 38, 7, shade(col, 1.3)); R(m, x + 6, 117, 2, 3, '#d02a2a'); R(m, x + 18, 120, 3, 2, '#ffc93a'); R(m, x + 24, 120, 3, 2, '#2fd6e8');
        R(m, x + 10, 140, 16, 22, '#0c0718'); R(m, x + 12, 142, 5, 8, '#ffb020'); R(m, x + 19, 142, 5, 8, '#ffb020');
      }
      R(m, 150, 22, 244, 34, '#0c0718'); R(m, 152, 24, 240, 30, '#1a0f33'); text(m, 'QUARTER PALACE', 272, 32, '#ffc93a', 2, 1, '#ff3d6e');
      return { far, mid, floor: floorTex({ c0: '#3a1a5a', c1: '#1e0e36', checker: '#c02a6a', line: '#000', edge: '#ffc93a', tw: 34 }) };
    },
    anim(c, cam, t) {
      const pc = ['#ff3d6e', '#2fd6e8', '#ffc93a', '#7dff8a', '#fff'];
      for (let i = 0; i < 12; i++) {
        const x = Math.round(8 + i * 44 - cam * 0.6); if (x < -40 || x > W) continue;
        const ph = Math.floor(t / (7 + i % 3)) + i * 5;
        R(c, x + 8 + (ph * 7) % 16, 90 + (ph * 5) % 14, 5, 4, pc[ph % 5]); R(c, x + 8 + (ph * 3 + 9) % 18, 92 + (ph * 11) % 16, 3, 3, pc[(ph + 2) % 5]); R(c, x + 6, 109, 24, 2, pc[(ph + 3) % 5]);
      }
      if ((t >> 4) % 6 === 0) { c.globalAlpha = 0.5; R(c, 152 - cam * 0.6, 24, 240, 30, '#1a0f33'); c.globalAlpha = 1; }
    }
  }
];
function buildStages() { for (const s of STAGES) Object.assign(s, s.build()); }
function drawStage(c, st, cam, t) {
  c.drawImage(st.far, -Math.round(cam * 0.25), 0);
  c.drawImage(st.mid, -Math.round(cam * 0.6), 0);
  drawFloor(c, st.floor, cam);
  st.anim(c, cam, t);
}
