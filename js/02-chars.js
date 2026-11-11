'use strict';
// LAST QUARTER - fighters: pixel rig, poses, move lists
// Angles are degrees from straight down; positive swings toward the way the fighter faces.
const TH = 21, SH = 21, TO = 29, UA = 15, FA = 14, D2R = Math.PI / 180, BOXK = 1.22;
const sn = a => Math.sin(a * D2R), cs = a => Math.cos(a * D2R);
function P(t, fa, fe, ba, be, fl, fk, bl, bk, o) { return Object.assign({ t, fa, fe, ba, be, fl, fk, bl, bk }, o || {}); }

function rigPts(p) {
  const fd = TH * cs(p.fl) + SH * cs(p.fl + p.fk), bd = TH * cs(p.bl) + SH * cs(p.bl + p.bk);
  const hy = (p.hy != null ? p.hy * BOXK : Math.max(fd, bd, 6)) + (p.bob || 0), hx = (p.dx || 0) * BOXK;
  const sx = hx + TO * sn(p.t), sy = hy + TO * cs(p.t), hd = p.t * 0.6 + (p.hd || 0);
  const leg = (a, k, off) => { const kx = hx + off + TH * sn(a), ky = hy - TH * cs(a); return [[hx + off, hy], [kx, ky], [kx + SH * sn(a + k), ky - SH * cs(a + k)]]; };
  const arm = (a, e, off) => { const ex = sx + off + UA * sn(a), ey = sy - 4 - UA * cs(a); return [[sx + off, sy - 4], [ex, ey], [ex + FA * sn(a + e), ey - FA * cs(a + e)]]; };
  return { hip: [hx, hy], sh: [sx, sy], head: [sx + 12 * sn(hd), sy + 12 * cs(hd)], fl: leg(p.fl, p.fk, 3), bl: leg(p.bl, p.bk, -3), fa: arm(p.fa, p.fe, 2), ba: arm(p.ba, p.be, -4) };
}
function stamp(c, x0, y0, x1, y1, w, col) {
  const dx = x1 - x0, dy = y1 - y0, n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy)))), h = w / 2;
  c.fillStyle = col;
  for (let i = 0; i <= n; i++) c.fillRect(Math.round(x0 + dx * i / n - h), Math.round(y0 + dy * i / n - h), w, w);
}
// a limb segment whose thickness swells and tapers: w = [start, middle, end]
function taper(c, a, b, w, d, col, ox, oy, t0, t1) {
  const dx = b[0] - a[0], dy = b[1] - a[1], n = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dy))));
  c.fillStyle = col;
  for (let i = Math.round(n * (t0 || 0)); i <= Math.round(n * (t1 == null ? 1 : t1)); i++) {
    const t = i / n, ww = Math.round((t < 0.5 ? w[0] + (w[1] - w[0]) * t * 2 : w[1] + (w[2] - w[1]) * (t - 0.5) * 2) + d);
    if (ww > 0) c.fillRect(Math.round(a[0] + dx * t - ww / 2 + (ox || 0)), Math.round(a[1] + dy * t - ww / 2 + (oy || 0)), ww, ww);
  }
}
// three-tone shading: shadow underneath, base, and a highlight on the side facing the light (up and forward)
function shadeSeg(c, a, b, w, T, face) {
  const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1; let nx = -dy / L, ny = dx / L;
  if (nx * face * 0.5 - ny * 0.85 < 0) { nx = -nx; ny = -ny; }
  taper(c, a, b, w, 0, T[0]); taper(c, a, b, w, -2, T[1], nx, ny);
  const o = Math.max(1, w[1] / 2 - 2.5); taper(c, a, b, [2, 3, 1], 0, T[2], nx * o, ny * o, 0.15, 0.7);
}
function ringRows(c, cx, cy, rx, ry, ix, iy, col, y0, y1) {
  c.fillStyle = col;
  for (let dy = Math.max(-ry, y0); dy <= Math.min(ry, y1); dy++) {
    const wo = Math.round(rx * Math.sqrt(1 - (dy * dy) / (ry * ry)));
    const wi = Math.abs(dy) < iy ? Math.round(ix * Math.sqrt(1 - (dy * dy) / (iy * iy))) : 0;
    if (wi > 0) { c.fillRect(cx - wo, cy + dy, wo - wi, 1); c.fillRect(cx + wi, cy + dy, wo - wi, 1); }
    else c.fillRect(cx - wo, cy + dy, wo * 2, 1);
  }
}
const SPRINK = ['#fff', '#6ee7ff', '#ffe94a', '#7dff8a', '#ff5a5a'];
function drawDonut(c, cx, cy, r, spin) {
  ringRows(c, cx, cy + 1, r + 1, r + 1, r * 0.3, r * 0.3, '#3a2010', -99, 99);
  ringRows(c, cx, cy + 1, r, r, r * 0.36, r * 0.36, '#d99a4e', -99, 99);
  ringRows(c, cx, cy - 1, r - 1, r - 1, r * 0.42, r * 0.42, '#ff7ac0', -99, 99);
  ringRows(c, cx - 1, cy - 2, r - 3, r - 3, r * 0.62, r * 0.62, '#ffa8d8', -99, -2);
  for (let i = 0; i < 7; i++) { const a = i * 0.9 + spin, d = r * 0.68; R(c, cx + Math.cos(a) * d, cy - 1 + Math.sin(a) * d, 2, 1, SPRINK[i % 5]); }
}
// giant donut seen from the side, ring around the body. half 0 = far side, 1 = near side
function drawTrapDonut(c, cx, cy, half) {
  const y0 = half ? 0 : -99, y1 = half ? 99 : -1;
  ringRows(c, cx, cy + 8, 35, 12, 15, 5, '#3a2010', y0, y1);
  ringRows(c, cx, cy + 7, 34, 11, 16, 5, '#b8792f', y0, y1);
  ringRows(c, cx, cy + 3, 34, 11, 16, 5, '#d99a4e', y0, y1);
  ringRows(c, cx, cy, 33, 10, 17, 6, '#ff7ac0', y0, y1);
  ringRows(c, cx, cy - 1, 29, 7, 21, 6, '#ffa8d8', Math.max(y0, -99), Math.min(y1, -3));
  for (let i = 0; i < 14; i++) { const a = i * 0.47 + 0.2, sx = Math.cos(a) * 26, sy = Math.sin(a) * 7; if ((sy >= 0) === !!half) R(c, cx + sx, cy + sy, 3, 1, SPRINK[i % 5]); }
}
function jag(c, x0, y0, x1, y1, col, amp, w) {
  let px = x0, py = y0; const n = Math.max(2, Math.round(Math.hypot(x1 - x0, y1 - y0) / 9));
  for (let i = 1; i <= n; i++) {
    const t = i / n, nx = x0 + (x1 - x0) * t + (i < n ? rnd(-amp, amp) : 0), ny = y0 + (y1 - y0) * t + (i < n ? rnd(-amp, amp) : 0);
    stamp(c, px, py, nx, ny, w || 1, col); px = nx; py = ny;
  }
}
function drawWeapon(c, hx, hy, face, ang, type, flash) {
  const ux = face * sn(ang), uy = cs(ang), dx = face * sn(ang - 90), dy = cs(ang - 90);
  const at = (a, b) => [hx + ux * a + dx * b, hy + uy * a + dy * b];
  const ln = (a0, b0, a1, b1, w, col) => { const p = at(a0, b0), q = at(a1, b1); stamp(c, p[0], p[1], q[0], q[1], w, col); };
  let mz;
  if (type === 'ak') {
    ln(-22, 0, 27, 0, 6, '#12081a'); ln(-2, 2, 4, 13, 5, '#12081a'); ln(-9, 2, -11, 8, 4, '#12081a');
    ln(-21, 1, -10, 0, 4, '#7a3e18'); ln(-21, 0, -11, -1, 2, '#b86a30');            // stock
    ln(-10, 0, 5, 0, 4, '#24242e'); ln(-9, -1, 5, -1, 1, '#5a5a6a');                  // receiver
    ln(5, 0, 14, 0, 4, '#7a3e18'); ln(5, -1, 14, -1, 2, '#b86a30');                   // handguard
    ln(14, 0, 27, 0, 2, '#3a3a46'); ln(14, -2, 22, -2, 1, '#5a5a6a'); ln(24, -2, 24, -4, 1, '#3a3a46'); // barrel, gas tube, sight
    ln(-1, 3, 5, 12, 3, '#3a3a46'); ln(0, 3, 5, 11, 1, '#6a6a7a');                    // curved magazine
    ln(-8, 3, -10, 7, 2, '#7a3e18');
    mz = at(29, 0);
  } else {
    ln(-1, 0, 13, 0, 6, '#12081a'); ln(0, 2, -1, 7, 4, '#12081a');
    ln(0, 0, 13, 0, 4, '#8a8a98'); ln(0, -1, 13, -1, 2, '#d8d8e4'); ln(0, 2, -1, 6, 2, '#2a2a34'); ln(4, 2, 6, 2, 1, '#2a2a34');
    mz = at(15, -1);
  }
  if (flash) {
    R(c, mz[0] - 4, mz[1] - 4, 9, 9, '#fff'); R(c, mz[0] - 7, mz[1] - 1, 15, 3, '#ffe94a');
    R(c, mz[0] - 1, mz[1] - 7, 3, 15, '#ffe94a'); stamp(c, mz[0], mz[1], mz[0] + ux * 13, mz[1] + uy * 13, 4, '#ffb020'); stamp(c, mz[0], mz[1], mz[0] + ux * 9, mz[1] + uy * 9, 2, '#fff');
  }
  return mz;
}
const LIMBW = { ua: [9, 10, 7], fa: [7, 9, 6], th: [12, 12, 9], sh: [9, 10, 7], to: [15, 20, 18] };
function drawRig(c, x, gy, face, p, ch, pal, t, muz) {
  const k = rigPts(p), S = v => [Math.round(x + face * v[0]), Math.round(gy - v[1])], ol = pal.ol, bk = ch.bulk || 0;
  const wid = (key, extra) => LIMBW[key].map(v => v + bk + (extra || 0));
  const limb = (pts, wA, wB, TA, TB) => {
    const a = S(pts[0]), b = S(pts[1]), e = S(pts[2]);
    taper(c, a, b, wA, 2, ol); taper(c, b, e, wB, 2, ol); shadeSeg(c, a, b, wA, TA, face); shadeSeg(c, b, e, wB, TB, face); return e;
  };
  const foot = (q, T) => {
    const fx = face > 0 ? q[0] - 5 : q[0] - 8;
    R(c, fx, q[1] - 6, 14, 7, ol); R(c, fx + 1, q[1] - 5, 12, 5, T[1]); R(c, fx + 1, q[1] - 1, 12, 1, T[0]);
    R(c, face > 0 ? fx + 6 : fx + 2, q[1] - 5, 6, 1, T[2]); R(c, face > 0 ? fx + 1 : fx + 10, q[1] - 5, 3, 4, T[0]);
  };
  const fist = (q, T) => {
    R(c, q[0] - 5, q[1] - 5, 10, 10, ol); R(c, q[0] - 4, q[1] - 4, 8, 8, T[0]); R(c, face > 0 ? q[0] - 3 : q[0] - 4, q[1] - 4, 7, 6, T[1]);
    R(c, face > 0 ? q[0] : q[0] - 3, q[1] - 4, 3, 2, T[2]); R(c, face > 0 ? q[0] + 2 : q[0] - 3, q[1] - 1, 1, 3, T[0]);
  };
  const T = pal.T, F = pal.F;
  // far-side limbs
  fist(limb(k.ba, wid('ua', -1), wid('fa', -1), F.sleeve, F.fore), F.hand);
  foot(limb(k.bl, wid('th', -1), wid('sh', -1), F.pants, F.shin), F.shoe);
  // pelvis and torso
  const hp = S(k.hip), sh = S(k.sh), hx = hp[0], hy = hp[1], tw = wid('to');
  R(c, hx - 9, hy - 7, 19, 13, ol); R(c, hx - 8, hy - 6, 17, 11, T.pants[1]); R(c, face > 0 ? hx - 8 : hx + 5, hy - 6, 4, 11, T.pants[0]);
  const ta = [hx, hy - 5], tb = [sh[0], sh[1] + 5];
  taper(c, ta, tb, tw, 2, ol); shadeSeg(c, ta, tb, tw, T.top, face);
  R(c, hx - 8, hy - 7, 17, 3, pal.belt); R(c, face > 0 ? hx + 2 : hx - 5, hy - 7, 3, 3, pal.beltL);
  const at = (u, off) => [Math.round(tb[0] + (ta[0] - tb[0]) * u + face * off), Math.round(tb[1] + (ta[1] - tb[1]) * u)];
  if (ch.deco) ch.deco(c, at, face, pal, p);
  // neck and head
  const hc = S(k.head), cx = hc[0], cy = hc[1];
  stamp(c, sh[0], sh[1] - 1, cx, cy + 3, 8, ol); stamp(c, sh[0], sh[1] - 1, cx, cy + 3, 6, pal.skinD);
  const px = (dx, dy, w, h, col) => R(c, face > 0 ? cx + dx : cx - dx - w, cy + dy, w, h, col);
  px(-7, -8, 14, 11, ol); px(-5, 2, 11, 7, ol); px(6, -1, 3, 5, ol);
  px(-6, -7, 12, 9, pal.skin); px(-4, 2, 9, 6, pal.skin); px(6, 0, 2, 3, pal.skin);
  px(-6, -2, 3, 4, pal.skinD); px(-4, 5, 3, 3, pal.skinD); px(-4, 7, 9, 1, pal.skinD); px(-3, -1, 2, 3, pal.skinD); px(6, 3, 1, 1, pal.skinD);
  px(1, -4, 5, 1, pal.ol); px(2, -3, 3, 2, pal.white); px(4, -3, 1, 2, pal.eye); px(3, 4, 3, 1, pal.mouth);
  ch.head(px, pal, t);
  // near-side leg, weapon, arm
  foot(limb(k.fl, wid('th'), wid('sh'), T.pants, T.shin), T.shoe);
  const wa = p.w != null ? p.w : ch.wRest, hpt = S(k.fa[2]);
  if (ch.weapon === 'ak' && !p.now) drawWeapon(c, hpt[0], hpt[1], face, wa, 'ak', muz);
  const s0 = S(k.fa[0]);
  const hd2 = limb(k.fa, wid('ua'), wid('fa'), T.sleeve, T.fore);
  R(c, s0[0] - 5, s0[1] - 6, 10, 3, T.sleeve[2]); R(c, s0[0] - 6, s0[1] - 4, 2, 5, T.sleeve[1]);
  if (ch.weapon === 'pistol' && !p.now) drawWeapon(c, hpt[0], hpt[1], face, wa, 'pistol', muz);
  fist(hd2, T.hand);
  if (p.prop === 'donut') drawDonut(c, hpt[0], hpt[1] - 6, 11, t * 0.3);
  return k;
}
// world position of the gun muzzle for the fighter's current pose
function muzzleOf(f) {
  const k = rigPts(f.pose), a = f.pose.w != null ? f.pose.w : f.ch.wRest, L = f.ch.weapon === 'ak' ? 29 : 15;
  return { x: f.x + f.face * (k.fa[2][0] + L * sn(a)), y: f.y + k.fa[2][1] - L * cs(a) };
}
const TONED = ['sleeve', 'fore', 'hand', 'pants', 'shin', 'shoe', 'top', 'skin'];
function lighten(h, k) { const p = hex(h); return 'rgb(' + p.map(v => Math.round(v + (255 - v) * k)).join(',') + ')'; }
function mkPal(o) {
  const p = Object.assign({ ol: '#12081a', eye: '#101018', belt: '#222222', white: '#ffffff', mouth: '#6a2a2a' }, o); p.T = {}; p.F = {};
  for (const key of TONED) { p.T[key] = [shade(p[key], 0.62), p[key], lighten(p[key], 0.32)]; p.F[key] = [shade(p[key], 0.4), shade(p[key], 0.6), shade(p[key], 0.78)]; }
  p.skinD = p.T.skin[0]; p.hairD = shade(p.hair, 0.62); p.hairL = lighten(p.hair, 0.38); p.accD = shade(p.acc, 0.62); p.accL = lighten(p.acc, 0.38); p.beltL = lighten(p.belt, 0.45);
  return p;
}
function monoPal(col, ol) {
  const p = { T: {}, F: {} };
  for (const key of ['skin', 'top', 'hair', 'acc', 'belt', 'eye', 'beard', 'skinD', 'hairD', 'hairL', 'accD', 'accL', 'beltL', 'white', 'mouth']) p[key] = col;
  for (const key of TONED) { p.T[key] = [col, col, col]; p.F[key] = [col, col, col]; }
  p.ol = ol; return p;
}
const PAL_W = monoPal('#ffffff', '#c8c8e0'), PAL_S = monoPal('#fff36a', '#ffffff'), PAL_G = monoPal('#ff4a66', '#ff4a66');

function basePoses(I) {
  const m = o => Object.assign({}, I, o);
  const C = m({ t: I.t + 8, fl: 75, fk: -115, bl: 20, bk: -112 });
  const J = m({ t: 2, fl: 55, fk: -95, bl: 15, bk: -85 });
  return {
    idle: I, idle2: m({ t: I.t + 2, bob: -1, fe: I.fe - 6 }),
    w1: m({ fl: 32, fk: -18, bl: -28, bk: -22 }), w2: m({ fl: 8, fk: -12, bl: 0, bk: -50, bob: 1 }),
    w3: m({ fl: -24, fk: -14, bl: 30, bk: -28 }), w4: m({ fl: 4, fk: -52, bl: 6, bk: -10, bob: 1 }),
    crouch: C, pre: m({ t: I.t + 10, fl: 50, fk: -80, bl: 10, bk: -80 }), jump: J, fall: m({ t: 0, fl: 30, fk: -40, bl: -5, bk: -40 }),
    bS: m({ t: -4, fa: 62, fe: 118, ba: 50, be: 125 }), bC: Object.assign({}, C, { t: 4, fa: 62, fe: 118, ba: 50, be: 125 }),
    hit1: m({ t: -20, hd: -14, fa: -15, fe: 35, ba: -35, be: 25, fl: 14, fk: -12, bl: -26, bk: -4 }),
    hit2: m({ t: 28, hd: 22, fa: 25, fe: 60, ba: 10, be: 70, fl: 20, fk: -30, bl: -20, bk: -20 }),
    hitC: Object.assign({}, C, { t: -8, hd: -12, fa: -10, fe: 40 }),
    airhit: m({ t: -65, hd: -10, fa: -70, fe: -20, ba: -100, be: -10, fl: 65, fk: -25, bl: 35, bk: -35 }),
    down: m({ t: -86, hd: -34, fa: -95, fe: 5, ba: -80, be: 0, fl: 86, fk: 2, bl: 80, bk: -14, hy: 5 }),
    getup: m({ t: 35, fa: 30, fe: 20, ba: 20, be: 30, fl: 70, fk: -120, bl: 10, bk: -100 }),
    win: m({ t: -2, fa: 172, fe: 8, ba: 8, be: 25, fl: 8, fk: -4, bl: -8, bk: -4, w: 178 }),
    trap: m({ t: 0, fa: 4, fe: 0, ba: -4, be: 0, fl: 6, fk: 0, bl: -6, bk: 0, now: 1 }),
    trapHit: m({ t: -8, hd: -30, fa: 4, fe: 0, ba: -4, be: 0, fl: 6, fk: 0, bl: -6, bk: 0, now: 1 })
  };
}

// ---------- frame data ----------
const STR = {
  L: { s: 4, a: 3, r: 6, d: 30, hs: 13, bs: 9, pu: 2.2, stop: 5, sf: 'hitL' },
  M: { s: 6, a: 4, r: 10, d: 55, hs: 17, bs: 12, pu: 2.8, stop: 7, sf: 'hitM' },
  H: { s: 9, a: 5, r: 16, d: 85, hs: 21, bs: 15, pu: 3.6, stop: 9, sf: 'hitH' }
};
function normal(str, S, A, box, o) {
  o = o || {}; const q = STR[str];
  return {
    str, low: o.low, cancel: str !== 'H', anim: [[S, q.s], [A, q.a + 2], [S, q.r - 2]], dur: q.s + q.a + q.r,
    hits: [{ f0: q.s, f1: q.s + q.a - 1, box, d: q.d, hs: q.hs, bs: q.bs, pu: q.pu, stop: q.stop, lv: o.lv || 'mid', sf: q.sf, el: o.el, launch: o.kd ? [1.6, 4.6] : null }]
  };
}
// Eli: every strike lands as a pair, the second coming out almost on top of the first
function twin(str, S, A1, A2, box, o) {
  o = o || {}; const q = STR[str], b2 = [box[0], box[1], box[2] + 3, box[3]];
  return {
    str, low: o.low, cancel: str !== 'H', anim: [[S, q.s], [A1, 4], [A2, 4], [S, q.r - 3]], dur: q.s + 5 + q.r,
    hits: [
      { f0: q.s, f1: q.s + 1, box, d: q.d * 0.5, hs: q.hs, bs: q.bs, pu: q.pu * 0.4, stop: 3, lv: o.lv || 'mid', sf: 'hitL' },
      { f0: q.s + 4, f1: q.s + 5, box: b2, d: q.d * 0.6, hs: q.hs, bs: q.bs, pu: q.pu, stop: q.stop, lv: o.lv || 'mid', sf: q.sf, launch: o.kd ? [1.6, 4.6] : null }]
  };
}
function airN(str, S, A, box, el) {
  const q = STR[str];
  return { str, air: 1, anim: [[S, 3], [A, 90]], dur: 999, hits: [{ f0: 3, f1: 60, box, d: q.d, hs: q.hs + 2, bs: q.bs, pu: q.pu, stop: q.stop, lv: 'high', sf: q.sf, el }] };
}
function twinAir(str, S, A1, A2, box) {
  const q = STR[str];
  return {
    str, air: 1, anim: [[S, 3], [A1, 5], [A2, 90]], dur: 999, hits: [
      { f0: 3, f1: 6, box, d: q.d * 0.5, hs: q.hs + 2, bs: q.bs, pu: 1, stop: 3, lv: 'high', sf: 'hitL' },
      { f0: 9, f1: 60, box, d: q.d * 0.6, hs: q.hs + 2, bs: q.bs, pu: q.pu, stop: q.stop, lv: 'high', sf: q.sf }]
  };
}
function stdSet(A, r, el) {
  const o = { el }, lo = { el, low: 1 }, lk = { el, low: 1, lv: 'low' }, bx = (b, d) => [b[0], b[1], b[2] + d, b[3]];
  return {
    sLP: normal('L', A.sLP[0], A.sLP[1], bx([6, 44, 30, 12], r), o), sMP: normal('M', A.sMP[0], A.sMP[1], bx([6, 42, 36, 14], r), o),
    sHP: normal('H', A.sHP[0], A.sHP[1], bx([6, 36, 40, 26], r), o),
    sLK: normal('L', A.sLK[0], A.sLK[1], A.sLKb || [6, 8, 32, 16], o), sMK: normal('M', A.sMK[0], A.sMK[1], [6, 30, 42, 16], o),
    sHK: normal('H', A.sHK[0], A.sHK[1], [6, 46, 44, 20], o),
    cLP: normal('L', A.cP[0], A.cP[1], bx([6, 24, 30, 12], r), lo), cMP: normal('M', A.cP[0], A.cP[1], bx([6, 24, 35, 12], r), lo),
    cHP: normal('H', A.cHP[0], A.cHP[1], [2, 34, 28, 44], o),
    cLK: normal('L', A.cK[0], A.cK[1], [6, 0, 36, 10], lk), cMK: normal('M', A.cK[0], A.cK[1], [6, 0, 41, 10], lk),
    cHK: normal('H', A.cK[0], A.cHK[1], [6, 0, 46, 12], { el, low: 1, lv: 'low', kd: 1 }),
    jLP: airN('L', A.jP[0], A.jP[1], [2, -4, 28, 30], el), jMP: airN('M', A.jP[0], A.jP[1], [2, -4, 30, 30], el), jHP: airN('H', A.jP[0], A.jP[1], [2, -6, 32, 32], el),
    jLK: airN('L', A.jK[0], A.jK[1], [0, -8, 32, 28], el), jMK: airN('M', A.jK[0], A.jK[1], [0, -8, 35, 28], el), jHK: airN('H', A.jK[0], A.jK[1], [0, -8, 38, 28], el)
  };
}
function twinSet(A) {
  const lo = { low: 1 }, lk = { low: 1, lv: 'low' }, T = (s, k, b, o) => twin(s, A[k][0], A[k][1], A[k][2], b, o);
  return {
    sLP: T('L', 'sLP', [6, 44, 30, 12]), sMP: T('M', 'sMP', [6, 38, 32, 16]), sHP: T('H', 'sHP', [6, 42, 38, 20]),
    sLK: T('L', 'sLK', [6, 8, 32, 16]), sMK: T('M', 'sMK', [6, 30, 40, 16]), sHK: T('H', 'sHK', [6, 46, 42, 20]),
    cLP: T('L', 'cP', [6, 24, 30, 12], lo), cMP: T('M', 'cP', [6, 24, 34, 12], lo), cHP: T('H', 'cHP', [2, 34, 28, 44]),
    cLK: T('L', 'cK', [6, 0, 36, 10], lk), cMK: T('M', 'cK', [6, 0, 40, 10], lk), cHK: T('H', 'cK', [6, 0, 44, 12], { low: 1, lv: 'low', kd: 1 }),
    jLP: twinAir('L', A.jP[0], A.jP[1], A.jP[2], [2, -4, 28, 30]), jMP: twinAir('M', A.jP[0], A.jP[1], A.jP[2], [2, -4, 30, 30]), jHP: twinAir('H', A.jP[0], A.jP[1], A.jP[2], [2, -6, 32, 32]),
    jLK: twinAir('L', A.jK[0], A.jK[1], A.jK[2], [0, -8, 32, 28]), jMK: twinAir('M', A.jK[0], A.jK[1], A.jK[2], [0, -8, 35, 28]), jHK: twinAir('H', A.jK[0], A.jK[1], A.jK[2], [0, -8, 38, 28])
  };
}
function scaleHits(mv) { if (mv.hits) for (const h of mv.hits) h.box = h.box.map(v => Math.round(v * BOXK)); }
function finishChar(ch) {
  for (const sp of ch.specials) sp.moves = [0, 1, 2].map(s => Object.assign({ name: sp.name, cost: sp.cost, special: 1 }, sp.mk(s)));
  for (const sp of ch.specials) sp.moves.forEach(scaleHits);
  for (const key in ch.normals) scaleHits(ch.normals[key]);
  return ch;
}

// ================= NIC : electricity =================
function mkNic() {
  const I = P(4, 28, 75, -8, 70, 20, -24, -20, -12), ps = basePoses(I), m = o => Object.assign({}, I, o), C = ps.crouch, J = ps.jump;
  const c = o => Object.assign({}, C, o), j = o => Object.assign({}, J, o);
  const cast1 = m({ t: -8, fa: -25, fe: 70, ba: -35, be: 60 }), cast2 = m({ t: 18, fa: 88, fe: 0, ba: 80, be: 6, fl: 30, fk: -34 });
  const upper = m({ t: -6, fa: 168, fe: 4, ba: 20, be: 60, fl: 12, fk: -10, bl: -18, bk: -60 }), sky = m({ t: -4, fa: 176, fe: 0, ba: 30, be: 40 });
  const A = {
    sLP: [m({ fa: 50, fe: 90 }), m({ t: 10, fa: 92, fe: 0 })],
    sMP: [m({ t: 0, fa: 30, fe: 95, ba: 20, be: 100 }), m({ t: 16, fa: 88, fe: 0, ba: 80, be: 6 })],
    sHP: [m({ t: -6, fa: 175, fe: 0 }), m({ t: 24, fa: 72, fe: 8 })],
    sLK: [m({ t: -4, fl: 60, fk: -70 }), m({ t: -6, fl: 56, fk: -4 })],
    sMK: [m({ t: -8, fl: 80, fk: -95 }), m({ t: -14, fl: 88, fk: 0 })],
    sHK: [m({ t: -10, fl: 100, fk: -105 }), m({ t: -24, fl: 116, fk: 0 })],
    cP: [c({ fa: 50, fe: 90 }), c({ t: C.t + 4, fa: 88, fe: 0 })],
    cHP: [C, m({ t: 2, fa: 155, fe: 8, fl: 30, fk: -45, bl: -15, bk: -40 })],
    cK: [c({ fl: 80, fk: -100 }), c({ t: C.t - 10, fl: 70, fk: -2 })], cHK: [C, c({ t: -18, fl: 74, fk: 0, ba: -50, be: -10 })],
    jP: [J, j({ fa: 62, fe: 0 })], jK: [J, j({ t: -8, fl: 52, fk: 0 })]
  };
  return finishChar({
    id: 'nic', name: 'NIC', title: 'LIVE WIRE', speed: 1.7, hp: 1000, jump: 7.9, dmg: 1, weapon: null, wRest: 90,
    stats: [3, 4, 3], quote: 'YOU NEVER SAW THE STORM COMING.',
    pal: mkPal({ skin: '#f0c090', top: '#2440a8', sleeve: '#2440a8', fore: '#1a2c78', hand: '#ffe94a', pants: '#22263c', shin: '#22263c', shoe: '#ffe94a', hair: '#ffe066', acc: '#ffe94a', belt: '#ffe94a' }),
    pal2: mkPal({ skin: '#f0c090', top: '#6a2aa8', sleeve: '#6a2aa8', fore: '#451a78', hand: '#6ee7ff', pants: '#2a2230', shin: '#2a2230', shoe: '#6ee7ff', hair: '#e8f4ff', acc: '#6ee7ff', belt: '#6ee7ff' }),
    head(px, pal) {
      px(-8, -10, 15, 5, pal.ol); px(-8, -6, 4, 8, pal.ol);
      px(-7, -9, 13, 4, pal.hair); px(-7, -6, 3, 7, pal.hair); px(4, -6, 3, 2, pal.hair);
      px(-6, -13, 4, 4, pal.ol); px(-2, -15, 5, 6, pal.ol); px(3, -13, 4, 4, pal.ol); px(6, -11, 3, 4, pal.ol);
      px(-5, -12, 2, 3, pal.hair); px(-1, -14, 3, 5, pal.hair); px(4, -12, 2, 3, pal.hair); px(6, -10, 2, 3, pal.hair);
      px(-3, -9, 7, 1, pal.hairL); px(0, -13, 1, 3, pal.hairL); px(-7, -2, 2, 3, pal.hairD);
    },
    deco(c, at, face, pal) {
      let q = at(0.12, 3); R(c, q[0] - 2, q[1], 5, 3, pal.acc); q = at(0.26, 1); R(c, q[0] - 2, q[1], 4, 3, pal.acc); q = at(0.4, 4); R(c, q[0] - 2, q[1], 5, 3, pal.acc); q = at(0.55, 2); R(c, q[0] - 1, q[1], 3, 3, pal.acc);
      q = at(0, 0); R(c, q[0] - 6, q[1] - 2, 12, 2, pal.accD);
    },
    poses: ps, normals: stdSet(A, 0, 1),
    ai: { zone: ['volt', 'bolt'], anti: 'upper', rush: 'volt', sup: 'storm', supD: [30, 320] },
    specials: [
      {
        key: 'storm', name: 'STORM SURGE', cmd: 'D,F,D,F+P', motion: 'sqcf', btn: 'P', cost: 1, mk: () => ({
          anim: [[cast1, 8], [cast2, 44], [cast2, 22]], dur: 74, beam: [10, 46],
          hits: [0, 1, 2, 3, 4].map(i => ({ f0: 10 + i * 8, f1: 11 + i * 8, box: [18, 32, 420, 28], d: i < 4 ? 58 : 90, hs: 22, bs: 16, pu: 1.5, stop: 5, lv: 'mid', el: 1, sf: 'zap', chip: 1, launch: i === 4 ? [4, 6] : null })),
          tick(f, o, mf) { if (mf === 10) sfx('thunder'); }
        })
      },
      {
        key: 'upper', name: 'THUNDER UPPER', cmd: 'F,D,DF+P', motion: 'dp', btn: 'P', mk: s => ({
          anim: [[C, 4], [upper, 90]], dur: 20, untilLand: 1, landRec: 10 + s * 2,
          hits: [{ f0: 4, f1: 14, box: [0, 28, 30, 62], d: 105 + s * 15, hs: 20, bs: 18, pu: 2, stop: 9, lv: 'mid', el: 1, sf: 'zap', chip: 1, launch: [2.2, 6.8] }],
          tick(f, o, mf) { if (mf < 6) f.inv = 2; if (mf === 4) { f.vy = 6.2 + s * 0.8; f.vx = f.face * (1.2 + s * 0.5); f.y = 0.01; sfx('zap'); } }
        })
      },
      {
        key: 'volt', name: 'VOLT BALL', cmd: 'D,DF,F+P', motion: 'qcf', btn: 'P', ok: f => !G.projs.some(p => p.type === 'volt' && p.owner === f), mk: s => ({
          anim: [[cast1, 9], [cast2, 40]], dur: 38 + s * 2,
          tick(f, o, mf) {
            if (mf === 11) {
              spawnProj(f, { type: 'volt', x: f.x + f.face * 36, y: f.y + 56, vx: f.face * (3.4 + s * 0.9), vy: 0, life: 140, w: 18, h: 18, hit: { d: 75, hs: 20, bs: 14, pu: 2.4, stop: 7, lv: 'mid', el: 1, sf: 'zap', chip: 1 } });
              sfx('zap');
            }
          }
        })
      },
      {
        key: 'bolt', name: 'SKY STRIKE', cmd: 'D,DB,B+K', motion: 'qcb', btn: 'K', ok: f => !G.projs.some(p => p.type === 'bolt' && p.owner === f), mk: s => ({
          anim: [[sky, 34]], dur: 34,
          tick(f, o, mf) {
            if (mf === 8) {
              spawnProj(f, { type: 'bolt', x: f.x + f.face * (80 + s * 64), y: 95, vx: 0, vy: 0, delay: 20, life: 32, w: 26, h: 190, hit: { d: 95, hs: 24, bs: 16, pu: 2, stop: 8, lv: 'mid', el: 1, sf: 'thunder', chip: 1 } });
              sfx('charge');
            }
          }
        })
      }]
  });
}

// ================= BRANDON : AK47 =================
function mkBrandon() {
  const I = P(8, 42, 52, 12, 85, 26, -30, -24, -10, { w: 80 }), ps = basePoses(I), m = o => Object.assign({}, I, o), C = ps.crouch, J = ps.jump;
  const c = o => Object.assign({}, C, o), j = o => Object.assign({}, J, o);
  const aim = m({ t: 2, fa: 78, fe: 14, ba: 38, be: 95, w: 90, fl: 26, fk: -34, bl: -26, bk: -8 }), aimUp = m({ t: -8, fa: 128, fe: 8, ba: 80, be: 70, w: 135 });
  const chg = m({ t: 30, fa: 70, fe: 20, ba: 40, be: 60, w: 90, fl: 40, fk: -50, bl: -35, bk: -10 });
  const smash = m({ t: 26, fa: 70, fe: 8, ba: 55, be: 30, w: 55 });
  const A = {
    sLP: [m({ fa: 15, fe: 95, w: 90 }), m({ t: 12, fa: 78, fe: 12, ba: 55, be: 35, w: 90 })],
    sMP: [m({ t: 0, fa: 60, fe: 90, w: 150 }), m({ t: 18, fa: 100, fe: -5, ba: 70, be: 30, w: 100 })],
    sHP: [m({ t: -8, fa: 170, fe: 5, ba: 150, be: 20, w: 215 }), smash],
    sLK: [m({ fl: 55, fk: -60 }), m({ t: -4, fl: 54, fk: -4 })],
    sMK: [m({ t: -6, fl: 85, fk: -100 }), m({ t: -12, fl: 90, fk: 0 })],
    sHK: [m({ t: -8, fl: 100, fk: -110 }), m({ t: -20, fl: 106, fk: 0 })],
    cP: [c({ fa: 30, fe: 80, w: 90 }), c({ fa: 84, fe: 6, w: 90 })],
    cHP: [C, m({ t: 4, fa: 140, fe: 0, ba: 110, be: 20, w: 150, fl: 30, fk: -45, bl: -15, bk: -40 })],
    cK: [c({ fl: 80, fk: -100 }), c({ t: C.t - 10, fl: 70, fk: -2 })], cHK: [C, c({ t: -16, fl: 74, fk: 0 })],
    jP: [J, j({ fa: 48, fe: 0, w: 40 })], jK: [J, j({ t: -8, fl: 52, fk: 0 })]
  };
  return finishChar({
    id: 'brandon', name: 'BRANDON', title: 'THIRTY ROUND MAG', speed: 1.35, hp: 1080, jump: 7.6, bulk: 1, dmg: 1.06, weapon: 'ak', wRest: 80, gun: 'gun',
    stats: [4, 2, 5], quote: 'THIRTY ROUNDS IN THE MAG. YOU LASTED THREE.',
    pal: mkPal({ skin: '#d9a377', top: '#4a5a2c', sleeve: '#4a5a2c', fore: '#d9a377', hand: '#2b2b2b', pants: '#b79b6a', shin: '#b79b6a', shoe: '#3b2a1a', hair: '#39451f', acc: '#33401c', belt: '#2b2b2b', beard: '#4a2f1a' }),
    pal2: mkPal({ skin: '#d9a377', top: '#3a3f4a', sleeve: '#3a3f4a', fore: '#d9a377', hand: '#1c1c1c', pants: '#2b2f38', shin: '#2b2f38', shoe: '#111111', hair: '#22252c', acc: '#22252c', belt: '#111', beard: '#2a2a2a' }),
    head(px, pal) {
      px(-8, -11, 16, 7, pal.ol); px(5, -6, 8, 4, pal.ol);
      px(-7, -10, 14, 5, pal.hair); px(-7, -6, 3, 3, pal.hair); px(5, -5, 7, 2, pal.accD); px(-4, -10, 7, 1, pal.hairL); px(-7, -6, 14, 1, pal.hairD);
      px(0, -4, 8, 4, pal.ol); px(1, -3, 6, 2, pal.eye); px(2, -3, 2, 1, pal.white);
      px(-5, 0, 5, 6, pal.beard); px(0, 2, 7, 6, pal.beard); px(-4, 6, 9, 2, pal.beard); px(3, 4, 3, 1, pal.ol); px(1, 2, 5, 1, pal.hairD);
    },
    deco(c, at, face, pal) {
      let q = at(0.2, 0); R(c, q[0] - 8, q[1], 16, 13, pal.accD); R(c, q[0] - 7, q[1] + 1, 14, 11, pal.acc);
      q = at(0.62, 3); R(c, q[0] - 3, q[1] - 1, 6, 8, pal.ol); R(c, q[0] - 2, q[1], 4, 6, pal.accD); R(c, q[0] - 2, q[1], 4, 2, pal.accL);
      q = at(0.62, -4); R(c, q[0] - 3, q[1] - 1, 6, 8, pal.ol); R(c, q[0] - 2, q[1], 4, 6, pal.accD); R(c, q[0] - 2, q[1], 4, 2, pal.accL);
      q = at(0.3, 2); R(c, q[0] - 3, q[1], 6, 2, pal.accL);
    },
    poses: ps, normals: stdSet(A, 12, 0),
    ai: { zone: ['burst', 'burst'], anti: 'flak', rush: 'charge', sup: 'auto', supD: [60, 330] },
    specials: [
      {
        key: 'auto', name: 'FULL AUTO', cmd: 'D,F,D,F+P', motion: 'sqcf', btn: 'P', cost: 1, mk: () => ({
          anim: [[aim, 62], [I, 20]], dur: 82,
          tick(f, o, mf) { const k = mf - 10; if (k >= 0 && k % 4 === 0 && k / 4 < 12) fireGun(f, { vx: 10, vy: rnd(-0.35, 0.35), d: 33 }); }
        })
      },
      {
        key: 'flak', name: 'FLAK BURST', cmd: 'F,D,DF+P', motion: 'dp', btn: 'P', mk: s => {
          const n = 2 + s; return {
            anim: [[aimUp, 8 + n * 4 + 4], [I, 14]], dur: 8 + n * 4 + 18,
            tick(f, o, mf) { const k = mf - 7; if (k >= 0 && k % 4 === 0 && k / 4 < n) fireGun(f, { vx: 6.3, vy: 6.3, d: 48, launch: [2, 5] }); }
          };
        }
      },
      {
        key: 'burst', name: 'BURST FIRE', cmd: 'D,DF,F+P', motion: 'qcf', btn: 'P', mk: s => {
          const n = 2 + s; return {
            anim: [[aim, 8 + n * 5 + 4], [I, 12]], dur: 8 + n * 5 + 16,
            tick(f, o, mf) { const k = mf - 8; if (k >= 0 && k % 5 === 0 && k / 5 < n) fireGun(f, { vx: 9.5, d: 36 }); }
          };
        }
      },
      {
        key: 'charge', name: 'STOCK CHARGE', cmd: 'D,DB,B+K', motion: 'qcb', btn: 'K', mk: s => ({
          anim: [[chg, 20 + 2 * s], [smash, 8], [I, 14]], dur: 42 + 2 * s,
          hits: [{ f0: 7, f1: 24 + 2 * s, box: [6, 28, 38, 30], d: 110 + s * 10, hs: 22, bs: 20, pu: 4, stop: 10, lv: 'mid', sf: 'hitH', chip: 1, launch: [3.5, 5.2] }],
          tick(f, o, mf) { if (mf >= 6 && mf < 20 + 2 * s) f.vx = f.face * (4 + s * 0.5); if (mf === 6) sfx('whoosh'); }
        })
      }]
  });
}

// ================= ELI : everything in twos =================
function mkEli() {
  const I = P(10, 45, 105, 22, 118, 20, -30, -20, -18), ps = basePoses(I), m = o => Object.assign({}, I, o), C = ps.crouch, J = ps.jump;
  const c = o => Object.assign({}, C, o), j = o => Object.assign({}, J, o);
  const fangW = m({ t: 20, fa: -10, fe: 100, ba: -20, be: 100, fl: 45, fk: -60, bl: -10, bk: -30 });
  const fang1 = m({ t: 26, fa: 92, fe: 0, fl: 40, fk: -40, bl: -40, bk: -5 }), fang2 = m({ t: 30, ba: 94, be: 0, fa: 30, fe: 100, fl: 40, fk: -40, bl: -40, bk: -5 });
  const rise1 = m({ t: -18, fl: 122, fk: 0, bl: -10, bk: -20, fa: 20, fe: 90 }), rise2 = m({ t: -28, bl: 140, bk: 0, fl: 10, fk: -70, fa: -20, fe: 60 });
  const dashW = m({ t: 34, fa: -30, fe: 60, ba: -40, be: 50, fl: 60, fk: -95, bl: -30, bk: -40 }), dash = m({ t: 42, fa: -50, fe: 10, ba: -60, be: 10, fl: 50, fk: -50, bl: -50, bk: -10 });
  const A = {
    sLP: [I, m({ t: 12, fa: 90, fe: 0 }), m({ t: 20, fa: 45, fe: 105, ba: 88, be: 0 })],
    sMP: [I, m({ t: 14, fa: 68, fe: 45 }), m({ t: 20, ba: 66, be: 48, fa: 40, fe: 110 })],
    sHP: [m({ t: -4, fa: 10, fe: 120 }), m({ t: 22, fa: 100, fe: -6 }), m({ t: 30, ba: 104, be: -6, fa: 30, fe: 110 })],
    sLK: [m({ fl: 50, fk: -60 }), m({ t: -4, fl: 56, fk: -4 }), m({ t: -4, bl: 58, bk: -4, fl: 10, fk: -10 })],
    sMK: [m({ t: -6, fl: 80, fk: -95 }), m({ t: -12, fl: 86, fk: 0 }), m({ t: -14, bl: 90, bk: 0, fl: 5, fk: -8 })],
    sHK: [m({ t: -8, fl: 100, fk: -105 }), m({ t: -22, fl: 112, fk: 0 }), m({ t: -26, bl: 120, bk: 0, fl: 0, fk: -6 })],
    cP: [C, c({ fa: 88, fe: 0 }), c({ ba: 86, be: 0, fa: 45, fe: 100 })],
    cHP: [C, m({ t: 4, fa: 150, fe: 10, fl: 30, fk: -45, bl: -15, bk: -40 }), m({ t: -2, ba: 160, be: 6, fa: 40, fe: 100, fl: 20, fk: -25, bl: -15, bk: -25 })],
    cK: [c({ fl: 80, fk: -100 }), c({ t: C.t - 8, fl: 70, fk: -2 }), c({ t: C.t - 8, fl: 74, fk: 0, dx: 3 })],
    jP: [J, j({ fa: 62, fe: 0 }), j({ ba: 64, be: 0 })], jK: [J, j({ t: -8, fl: 52, fk: 0 }), j({ t: -8, bl: 56, bk: 0, fl: 40, fk: -90 })]
  };
  const rush = []; for (let i = 0; i < 4; i++) rush.push([fang1, 5], [fang2, 5]);
  return finishChar({
    id: 'eli', name: 'ELI', title: 'DOUBLE TAP', speed: 2.1, hp: 940, jump: 8.2, dmg: 1, weapon: null, wRest: 90,
    stats: [3, 5, 2], quote: 'ONCE IS NEVER ENOUGH.',
    pal: mkPal({ skin: '#c98d62', top: '#a81c2c', sleeve: '#c98d62', fore: '#f1ead8', hand: '#f1ead8', pants: '#18181f', shin: '#18181f', shoe: '#c98d62', hair: '#141414', acc: '#e02a3a', belt: '#f1ead8' }),
    pal2: mkPal({ skin: '#c98d62', top: '#1c5aa8', sleeve: '#c98d62', fore: '#f1ead8', hand: '#f1ead8', pants: '#e8e4d8', shin: '#e8e4d8', shoe: '#c98d62', hair: '#141414', acc: '#2a8ae0', belt: '#222' }),
    head(px, pal, t) {
      const fl = (t >> 3) & 1;
      px(-8, -10, 15, 5, pal.ol); px(-8, -6, 4, 9, pal.ol);
      px(-7, -9, 13, 3, pal.hair); px(-7, -6, 3, 8, pal.hair); px(-3, -9, 6, 1, pal.hairL);
      px(-8, -7, 16, 4, pal.ol); px(-7, -6, 14, 2, pal.acc); px(-2, -6, 6, 1, pal.accL);
      px(-11, -7, 4, 4, pal.ol); px(-10, -6, 3, 2, pal.accD);
      px(-15, -7 + fl, 6, 4, pal.ol); px(-14, -6 + fl, 5, 2, pal.acc); px(-18, -4 - fl, 6, 4, pal.ol); px(-17, -3 - fl, 5, 2, pal.accD);
    },
    deco(c, at, face, pal) {
      let q = at(0.1, 2); R(c, q[0] - 1, q[1], 2, 14, pal.accL); R(c, q[0] + 3, q[1], 2, 14, pal.accL);
      q = at(0, 0); R(c, q[0] - 3, q[1] - 3, 7, 4, pal.skin);
    },
    poses: ps, normals: twinSet(A),
    ai: { zone: ['blitz', 'fang'], anti: 'rise', rush: 'fang', sup: 'double', supD: [20, 130] },
    specials: [
      {
        key: 'double', name: 'DOUBLE OR NOTHING', cmd: 'D,F,D,F+P', motion: 'sqcf', btn: 'P', cost: 1, mk: () => ({
          anim: [[dashW, 6], [dash, 10]].concat(rush, [[I, 18]]), dur: 74, trail: 1,
          hits: [0, 1, 2, 3, 4, 5, 6, 7].map(i => ({ f0: 16 + i * 5, f1: 17 + i * 5, box: [4, 28, 42, 34], d: i < 7 ? 40 : 80, hs: 22, bs: 14, pu: 0.6, stop: i < 7 ? 3 : 12, lv: 'mid', sf: i < 7 ? 'hitM' : 'hitH', chip: 1, launch: i === 7 ? [3.5, 7] : null })),
          tick(f, o, mf) {
            if (mf >= 6 && mf < 16) { if (Math.abs(o.x - f.x) < 50) f.mf = 15; else f.vx = f.face * 7.5; }
            else if (mf >= 16 && mf < 56) f.vx = f.face * 0.8;
          }
        })
      },
      {
        key: 'rise', name: 'DOUBLE RISE', cmd: 'F,D,DF+K', motion: 'dp', btn: 'K', mk: s => ({
          anim: [[C, 4], [rise1, 8], [rise2, 90]], dur: 20, untilLand: 1, landRec: 12 + s * 2,
          hits: [
            { f0: 4, f1: 9, box: [0, 18, 32, 52], d: 55, hs: 20, bs: 16, pu: 1, stop: 5, lv: 'mid', sf: 'hitM', chip: 1, launch: [0.8, 5.4] },
            { f0: 12, f1: 18, box: [0, 26, 34, 56], d: 65 + s * 10, hs: 20, bs: 16, pu: 2, stop: 9, lv: 'mid', sf: 'hitH', chip: 1, launch: [2.6, 6.6] }],
          tick(f, o, mf) { if (mf < 6) f.inv = 2; if (mf === 4) { f.vy = 6.4 + s * 0.6; f.vx = f.face * (1.4 + s * 0.4); f.y = 0.01; sfx('whoosh'); } }
        })
      },
      {
        key: 'fang', name: 'TWIN FANG', cmd: 'D,DF,F+P', motion: 'qcf', btn: 'P', mk: s => ({
          anim: [[fangW, 6], [fang1, 5], [fang2, 6], [I, 12 + s * 2]], dur: 29 + s * 2,
          hits: [
            { f0: 6, f1: 9, box: [6, 36, 40, 18], d: 50, hs: 18, bs: 12, pu: 1, stop: 4, lv: 'mid', sf: 'hitM', chip: 1 },
            { f0: 11, f1: 14, box: [6, 36, 44, 18], d: 60 + s * 8, hs: 20, bs: 16, pu: 3.4, stop: 8, lv: 'mid', sf: 'hitH', chip: 1, launch: s === 2 ? [3, 5] : null }],
          tick(f, o, mf) { if (mf >= 4 && mf < 11) f.vx = f.face * (3.6 + s * 0.9); if (mf === 4) sfx('whoosh'); }
        })
      },
      {
        key: 'blitz', name: 'BLITZ DASH', cmd: 'HOLD B, THEN F+K', motion: 'chg', btn: 'K', mk: s => {
          const len = 10 + s * 3; return {
            anim: [[dashW, 7], [dash, len], [fang1, 4], [fang2, 4], [I, 8]], dur: 7 + len + 16, trail: 1,
            hits: [
              { f0: 7 + len, f1: 9 + len, box: [6, 34, 34, 22], d: 45, hs: 18, bs: 12, pu: 0.8, stop: 4, lv: 'mid', sf: 'hitM', chip: 1 },
              { f0: 11 + len, f1: 13 + len, box: [6, 34, 38, 22], d: 60, hs: 20, bs: 14, pu: 3, stop: 8, lv: 'mid', sf: 'hitH', chip: 1 }],
            tick(f, o, mf) {
              if (mf === 0) { sfx('charge'); f.glow = 7; }
              if (mf >= 7 && mf < 7 + len) {
                if (mf === 7) sfx('whoosh');
                if (Math.abs(o.x - f.x) < 50 && Math.abs(o.y - f.y) < 60) f.mf = 6 + len; else f.vx = f.face * 8.5;
              }
            }
          };
        }
      }]
  });
}

// ================= CODY : handgun and the donut =================
function mkCody() {
  const I = P(5, 44, 48, 30, 68, 20, -24, -20, -12, { w: 84 }), ps = basePoses(I), m = o => Object.assign({}, I, o), C = ps.crouch, J = ps.jump;
  const c = o => Object.assign({}, C, o), j = o => Object.assign({}, J, o);
  const aim = m({ t: -3, fa: 90, fe: 0, ba: -10, be: 40, w: 90 }), aimUp = m({ t: -8, fa: 135, fe: 0, ba: -10, be: 40, w: 135 });
  const roll1 = m({ t: 75, fa: 60, fe: 90, ba: 50, be: 90, fl: 110, fk: -150, bl: 95, bk: -150, hy: 9, w: 90 });
  const roll2 = m({ t: -75, fa: -60, fe: 90, ba: -50, be: 90, fl: 110, fk: -150, bl: 95, bk: -150, hy: 12, w: 90, dx: 8 });
  const lowAim = c({ fa: 86, fe: 0, w: 90 });
  const IN = m({ now: 1, fa: 40, fe: 100, ba: 20, be: 110 });
  const thW = m({ t: -12, fa: -40, fe: -20, ba: 20, be: 80, now: 1, prop: 'donut' }), thA = m({ t: 20, fa: 95, fe: 0, ba: 10, be: 60, now: 1 });
  const fp1 = m({ t: 16, ba: 96, be: 0, fa: 30, fe: 110, now: 1 }), fp2 = m({ t: 20, fa: 98, fe: 0, ba: 20, be: 110, now: 1 });
  const fpW = m({ t: -16, fa: -50, fe: 100, ba: 30, be: 100, now: 1, fl: 10, fk: -20, bl: -34, bk: -10 });
  const fpB = m({ t: 32, fa: 102, fe: -4, ba: -20, be: 60, now: 1, fl: 40, fk: -40, bl: -44, bk: -4 });
  const run = [ps.w1, ps.w2, ps.w3, ps.w4].map(q => Object.assign({}, q, { t: 22, now: 1 }));
  const A = {
    sLP: [m({ ba: 40, be: 100 }), m({ t: 10, ba: 92, be: 0, fa: 20, fe: 115, w: 170 })],
    sMP: [m({ t: -4, fa: 120, fe: 40, w: 200 }), m({ t: 16, fa: 96, fe: 0, w: 110 })],
    sHP: [m({ t: -10, ba: -20, be: 110, fa: 30, fe: 100, w: 150 }), m({ t: 26, ba: 104, be: -8, fa: 10, fe: 110, w: 150 })],
    sLK: [m({ fl: 40, fk: -60 }), m({ t: 6, fl: 78, fk: -95 })], sLKb: [6, 20, 24, 22],
    sMK: [m({ t: -8, fl: 80, fk: -95 }), m({ t: -14, fl: 90, fk: 0 })],
    sHK: [m({ t: -12, fl: 150, fk: 0 }), m({ t: 8, fl: 78, fk: 0 })],
    cP: [C, c({ ba: 88, be: 0 })],
    cHP: [C, m({ t: 2, fa: 152, fe: 4, w: 175, fl: 30, fk: -45, bl: -15, bk: -40 })],
    cK: [c({ fl: 80, fk: -100 }), c({ t: C.t - 10, fl: 70, fk: -2 })], cHK: [C, c({ t: -16, fl: 74, fk: 0 })],
    jP: [J, j({ fa: 55, fe: 0, w: 60 })], jK: [J, j({ t: -8, fl: 52, fk: 0 })]
  };
  const ch = finishChar({
    id: 'cody', name: 'CODY', title: 'SIDEARM', speed: 1.75, hp: 1000, jump: 7.9, dmg: 1, weapon: 'pistol', wRest: 84, gun: 'pistol',
    stats: [4, 3, 4], quote: "SAFETY'S OFF. SO ARE YOU.",
    pal: mkPal({ skin: '#f2c9a0', top: '#f4f4f0', sleeve: '#f4f4f0', fore: '#f2c9a0', hand: '#f2c9a0', pants: '#3566b0', shin: '#3566b0', shoe: '#e8e8e8', hair: '#d8b25a', acc: '#1e6fd0', belt: '#5a3a1e' }),
    pal2: mkPal({ skin: '#f2c9a0', top: '#26262c', sleeve: '#26262c', fore: '#f2c9a0', hand: '#f2c9a0', pants: '#6a6f7a', shin: '#6a6f7a', shoe: '#d02a2a', hair: '#d8b25a', acc: '#d02a2a', belt: '#111' }),
    head(px, pal) {
      px(-8, -11, 15, 7, pal.ol); px(-14, -7, 8, 4, pal.ol);
      px(-7, -10, 13, 5, pal.acc); px(-13, -6, 7, 2, pal.accD); px(-3, -10, 6, 1, pal.accL); px(-7, -6, 13, 1, pal.accD); px(2, -8, 3, 2, pal.white);
      px(3, -5, 4, 2, pal.hair); px(-7, -5, 3, 5, pal.hair); px(-7, -1, 2, 2, pal.hairD);
    },
    deco(c, at, face, pal, p) {
      let q = at(0, 0); R(c, q[0] - 4, q[1] - 2, 9, 3, pal.T.top[0]);
      q = at(1, -6); R(c, q[0] - 3, q[1] + 1, 6, 10, pal.ol); R(c, q[0] - 2, q[1] + 2, 4, 8, pal.belt); if (p.now) { R(c, q[0] - 2, q[1] - 1, 4, 4, '#8a8a98'); R(c, q[0] - 2, q[1] - 1, 4, 1, '#d8d8e4'); }
    },
    poses: ps, normals: stdSet(A, 3, 0),
    ai: { zone: ['quick', 'quick'], anti: 'sky', rush: 'roll', sup: 'donut', supD: [50, 230] },
    specials: [
      {
        key: 'donut', name: 'DONUT HOLE', cmd: 'D,F,D,F+P', motion: 'sqcf', btn: 'P', cost: 1, mk: () => ({
          anim: [[thW, 14], [thA, 12], [IN, 22]], dur: 48,
          tick(f, o, mf) { if (mf === 14) { spawnProj(f, { type: 'donut', x: f.x + f.face * 30, y: f.y + 54, vx: f.face * 4.8, vy: 0, life: 90, w: 24, h: 28, grab: 1, hit: {} }); sfx('whoosh'); } }
        })
      },
      {
        key: 'sky', name: 'SKY SHOT', cmd: 'F,D,DF+P', motion: 'dp', btn: 'P', mk: s => ({
          anim: [[aimUp, 22], [I, 10 + s * 2]], dur: 32 + s * 2,
          tick(f, o, mf) { if (mf === 7) fireGun(f, { vx: 6.6, vy: 6.6, d: 95 + s * 10, launch: [2.2, 5.5] }); }
        })
      },
      {
        key: 'quick', name: 'QUICK DRAW', cmd: 'D,DF,F+P', motion: 'qcf', btn: 'P', mk: s => ({
          anim: [[I, 2], [aim, 14 + s * 3], [I, 10]], dur: 26 + s * 3,
          tick(f, o, mf) { if (mf === 6 + s * 3) fireGun(f, { vx: 11, d: 70 + s * 22, hs: 18 + s * 2 }); }
        })
      },
      {
        key: 'roll', name: 'COMBAT ROLL', cmd: 'D,DB,B+K', motion: 'qcb', btn: 'K', mk: s => {
          const len = 16 + s * 4, an = []; for (let i = 0; i < len; i += 4) an.push([(i / 4) % 2 ? roll2 : roll1, 4]);
          return {
            low: 1, anim: an.concat([[lowAim, 14], [C, 8]]), dur: len + 22,
            tick(f, o, mf) {
              if (mf === 0) sfx('whoosh');
              if (mf < len) { f.vx = f.face * (4.2 + s * 0.5); f.ghost = true; f.projInv = 2; }
              if (mf === len) f.face = o.x >= f.x ? 1 : -1;
              if (mf === len + 4) fireGun(f, { vx: 10, d: 50 + s * 8, lv: 'low' });
            }
          };
        }
      }]
  });
  // the finisher: once the donut lands, Cody walks in and works the face
  const HITS = [26, 40, 54, 68];
  ch.finish = {
    name: 'DONUT HOLE', special: 1, anim: [[IN, 999]], dur: 128,
    tick(f, o, mf) {
      f.inv = 2; f.ghost = true;
      if (mf < 22) { f.x += (o.x - f.face * 40 - f.x) * 0.25; f.pose = run[(mf >> 2) & 3]; return; }
      f.pose = IN;
      HITS.forEach((T, i) => { if (mf === T) finHit(f, o, 45, false); if (mf >= T && mf < T + 7) f.pose = i % 2 ? fp2 : fp1; });
      if (mf >= 76 && mf < 100) f.pose = fpW;
      if (mf === 100) finHit(f, o, 160, true);
      if (mf >= 100 && mf < 120) f.pose = fpB;
    }
  };
  return ch;
}
const CHARS = [mkNic(), mkEli(), mkBrandon(), mkCody()];
