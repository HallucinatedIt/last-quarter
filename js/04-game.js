'use strict';
// LAST QUARTER - fight engine, CPU, screens, cabinet panel
const GRAV = 0.42;
const G = {
  scene: 'title', t: 0, frame: 0, credits: 0, mode: 'cpu', prev: [0, 0],
  sel: [{ i: 0, ok: false }, { i: 3, ok: false }], stage: 0, ladder: null, lpos: 0, wait: 0, roll: 0,
  f: [], projs: [], parts: [], flashes: [], round: 1, phase: 'intro', pt: 0, timer: 99, hitstop: 0, freeze: 0, shake: 0,
  cam: CAM_MAX / 2, camT: CAM_MAX / 2, ft: 0, rt: 0, trap: null, combo: [null, null], winner: 0, rw: null,
  superName: '', donutKO: false, timeUp: false, perfect: false
};
let PORTRAITS = [], tmpC, tmpX;

function mkPortrait(ch, pal, alt) {
  const [c, x] = mkc(48, 48);
  R(x, 0, 0, 48, 48, alt ? '#123048' : '#3a1630');
  for (let i = 0; i < 48; i += 6) R(x, 0, i, 48, 2, alt ? '#18405c' : '#4a1c3c');
  x.save(); x.scale(3, 3); drawRig(x, 6, 73, 1, ch.poses.idle, ch, pal, 0, false); x.restore();
  return c;
}

// ---------- fighters ----------
function newFighter(idx, ci, alt, cpu) {
  const ch = CHARS[ci];
  return { idx, ci, ch, pal: alt ? ch.pal2 : ch.pal, alt, cpu, ai: cpu ? { t: 0, plan: 'idle', blockP: 0.5, hold: 0, spec: null } : null, wins: 0, meter: 0 };
}
function resetFighter(f) {
  Object.assign(f, {
    x: STAGE_W / 2 + (f.idx ? 70 : -70), y: 0, vx: 0, vy: 0, kb: 0, face: f.idx ? -1 : 1, state: 'wait', st: 0, hp: f.ch.hp, hpShow: f.ch.hp,
    move: null, mf: 0, hitDone: [], hitAt: [], connected: false, combo: 0, juggle: 0, buf: { b: 0, f: -99 }, hist: [], charge: 0, chargeReady: 0,
    pose: f.ch.poses.idle, flash: 0, shock: 0, crouch: false, prev: 0, dir: 5, trail: [], inv: 0, projInv: 0, ghost: false, wt: 0, glow: 0, muz: 0, snap: 0, hitPose: 'hit1', jdir: 0
  });
}
function relDir(f, inp) {
  const h = (((inp & B.R) ? 1 : 0) - ((inp & B.L) ? 1 : 0)) * f.face, v = ((inp & B.U) ? 1 : 0) - ((inp & B.D) ? 1 : 0);
  return 5 + h + v * 3;
}
function recInput(f, inp) {
  const d = relDir(f, inp); f.dir = d;
  const pr = inp & ~f.prev & ATK; f.prev = inp;
  const h = f.hist; if (!h.length || h[h.length - 1].d !== d) { h.push({ d, f: G.ft }); if (h.length > 14) h.shift(); }
  if (pr) f.buf = { b: pr, f: G.ft };
  if (d === 4 || d === 1 || d === 7) { f.charge++; if (f.charge === 40 && f.ch.id === 'eli') { f.glow = 10; sfx('charge'); } }
  else { if (f.charge >= 40) f.chargeReady = 13; f.charge = 0; }
  if (f.chargeReady > 0) f.chargeReady--;
}
function hasMotion(f, seq, win) {
  const h = f.hist; let k = seq.length - 1, firstEnd = 0;
  for (let i = h.length - 1; i >= 0; i--) {
    if (h[i].d === seq[k]) {
      const end = i + 1 < h.length ? h[i + 1].f : G.ft;
      if (k === seq.length - 1 && G.ft - end > 9) return false;
      firstEnd = end; if (--k < 0) return G.ft - firstEnd <= win;
    }
  }
  return false;
}
function findSpecial(f, b) {
  if (f.cpu) {
    const s = f.ai.spec; f.ai.spec = null; if (!s) return null;
    const sp = f.ch.specials.find(q => q.key === s.key);
    return sp && (!sp.cost || f.meter >= 100) && (!sp.ok || sp.ok(f)) ? sp.moves[s.str] : null;
  }
  const str = b & (B.HP | B.HK) ? 2 : b & (B.MP | B.MK) ? 1 : 0;
  for (const sp of f.ch.specials) {
    if (!(b & (sp.btn === 'P' ? PUNCH : KICK))) continue;
    if (sp.cost && f.meter < 100) continue;
    if (sp.ok && !sp.ok(f)) continue;
    let m = false;
    if (sp.motion === 'sqcf') m = hasMotion(f, [2, 6, 2, 6], 44);
    else if (sp.motion === 'dp') m = f.dir === 3 && hasMotion(f, [6, 2, 3], 26);
    else if (sp.motion === 'qcf') m = hasMotion(f, [2, 3, 6], 22);
    else if (sp.motion === 'qcb') m = hasMotion(f, [2, 1, 4], 22);
    else if (sp.motion === 'chg') m = f.chargeReady > 0 && (f.dir === 6 || f.dir === 3 || f.dir === 9);
    if (m) { f.chargeReady = 0; f.hist.length = 0; return sp.moves[str]; }
  }
  return null;
}
function startMove(f, mv) {
  f.state = 'atk'; f.move = mv; f.mf = 0; f.hitDone = []; f.hitAt = []; f.connected = false;
  if (!mv.air) f.crouch = !!mv.low;
  if (mv.cost) { f.meter = 0; G.freeze = 44; G.superName = mv.name; sfx('super'); }
  f.pose = mv.anim[0][0];
}
function tryAttack(f, o, air) {
  if (G.ft - f.buf.f > 6 || !f.buf.b) return false;
  const b = f.buf.b; let mv = air ? null : findSpecial(f, b);
  if (!mv) {
    const nm = b & B.HP ? 'HP' : b & B.MP ? 'MP' : b & B.LP ? 'LP' : b & B.HK ? 'HK' : b & B.MK ? 'MK' : 'LK';
    mv = f.ch.normals[(air ? 'j' : f.dir <= 3 ? 'c' : 's') + nm];
  }
  if (!mv) return false;
  f.buf.b = 0; startMove(f, mv); return true;
}
function runMove(f, o) {
  const mv = f.move;
  if (mv.cancel && f.connected && f.buf.b && G.ft - f.buf.f <= 8) {
    const sp = findSpecial(f, f.buf.b);
    if (sp) { f.buf.b = 0; startMove(f, sp); return; }
  }
  if (f.y <= 0) f.vx = 0;
  let t = f.mf, pose = mv.anim[mv.anim.length - 1][0];
  for (const s of mv.anim) { if (t < s[1]) { pose = s[0]; break; } t -= s[1]; }
  f.pose = pose;
  if (mv.tick) mv.tick(f, o, f.mf);
  if (mv.trail && (G.ft & 1)) f.trail.push({ x: f.x, y: f.y, pose: f.pose, face: f.face, t: 8 });
  f.mf++;
  if (!mv.air && !mv.untilLand && f.mf >= mv.dur) { f.state = 'idle'; f.move = null; }
}
function updFighter(f, o) {
  const ps = f.ch.poses, d = f.dir;
  if (f.flash > 0) f.flash--; if (f.shock > 0) f.shock--; if (f.inv > 0) f.inv--; if (f.projInv > 0) f.projInv--;
  if (f.glow > 0) f.glow--; if (f.muz > 0) f.muz--; if (f.snap > 0) f.snap--;
  f.ghost = false;
  if (f.hpShow > f.hp) f.hpShow = Math.max(f.hp, f.hpShow - 5);
  for (const tr of f.trail) tr.t--; if (f.trail.length && f.trail[0].t <= 0) f.trail.shift();
  switch (f.state) {
    case 'wait': f.vx = 0; f.pose = (G.rt >> 4) & 1 ? ps.idle2 : ps.idle; break;
    case 'win': f.vx = 0; f.pose = ps.win; break;
    case 'idle':
      if (o.x !== f.x) f.face = o.x > f.x ? 1 : -1;
      if (tryAttack(f, o, false)) break;
      if (d >= 7) { f.state = 'pre'; f.st = 0; f.jdir = d === 9 ? 1 : d === 7 ? -1 : 0; f.vx = 0; f.pose = ps.pre; break; }
      if (d <= 3) { f.vx = 0; f.crouch = true; f.pose = ps.crouch; }
      else {
        f.crouch = false;
        if (d === 6) { f.vx = f.face * f.ch.speed; f.wt++; } else if (d === 4) { f.vx = -f.face * f.ch.speed * 0.8; f.wt--; } else { f.vx = 0; f.wt = 0; }
        f.pose = f.vx ? [ps.w1, ps.w2, ps.w3, ps.w4][(((f.wt >> 3) % 4) + 4) % 4] : ((G.rt >> 4) & 1 ? ps.idle2 : ps.idle);
      }
      break;
    case 'pre': f.pose = ps.pre; if (++f.st >= 4) { f.vy = f.ch.jump; f.vx = f.jdir * f.face * 2.3; f.y = 0.01; f.state = 'air'; sfx('jump'); } break;
    case 'air': f.pose = f.vy > -1 ? ps.jump : ps.fall; tryAttack(f, o, true); break;
    case 'atk': runMove(f, o); break;
    case 'hit': f.vx = 0; f.pose = f.crouch ? ps.hitC : ps[f.hitPose]; if (--f.st <= 0) { f.state = 'idle'; f.combo = 0; } break;
    case 'block': f.vx = 0; f.pose = f.crouch ? ps.bC : ps.bS; if (--f.st <= 0) f.state = 'idle'; break;
    case 'airhit': f.pose = ps.airhit; break;
    case 'down': f.vx = 0; f.pose = ps.down; if (f.hp > 0 && --f.st <= 0) { f.state = 'getup'; f.st = 14; } break;
    case 'getup': f.pose = ps.getup; if (--f.st <= 0) { f.state = 'idle'; f.combo = 0; f.juggle = 0; } break;
    case 'rec': f.vx = 0; f.pose = ps.crouch; if (--f.st <= 0) f.state = 'idle'; break;
    case 'trapped': f.vx = 0; f.pose = f.snap > 0 ? ps.trapHit : ps.trap; break;
  }
}
function land(f) {
  if (f.state === 'air') { f.state = 'idle'; f.vx = 0; sfx('land'); }
  else if (f.state === 'atk') { const mv = f.move; if (mv && mv.untilLand) { f.state = 'rec'; f.st = mv.landRec || 10; } else f.state = 'idle'; f.move = null; f.vx = 0; sfx('land'); }
  else if (f.state === 'airhit') {
    f.state = 'down'; f.st = 38; f.vx = 0; G.shake = Math.max(G.shake, 3); sfx('land');
    for (let i = 0; i < 6; i++) part(f.x + rnd(-14, 14), GROUND, rnd(-1, 1), rnd(-1.2, -0.2), 16, '#d8d0c0', 2, 0.02);
  }
}
function physics(f) {
  f.x += f.vx + f.kb; f.kb *= 0.8; if (Math.abs(f.kb) < 0.1) f.kb = 0;
  if (f.y > 0 || f.vy > 0) { f.y += f.vy; f.vy -= GRAV; if (f.y <= 0) { f.y = 0; f.vy = 0; land(f); } }
}
function bounds(f) { f.x = clamp(f.x, Math.max(14, G.camT + 12), Math.min(STAGE_W - 14, G.camT + W - 12)); }
function pushApart(a, b) {
  if (a.ghost || b.ghost || a.state === 'down' || b.state === 'down' || Math.abs(a.y - b.y) > 50) return;
  const dx = b.x - a.x, ov = 24 - Math.abs(dx); if (ov <= 0) return;
  const s = dx > 0 ? 1 : dx < 0 ? -1 : (a.idx ? -1 : 1);
  a.x -= s * ov / 2; b.x += s * ov / 2;
  const lo = Math.max(14, G.camT + 12), hi = Math.min(STAGE_W - 14, G.camT + W - 12);
  if (a.x < lo) { b.x += lo - a.x; a.x = lo; } if (a.x > hi) { b.x -= a.x - hi; a.x = hi; }
  if (b.x < lo) { a.x += lo - b.x; b.x = lo; } if (b.x > hi) { a.x -= b.x - hi; b.x = hi; }
}
const isLow = f => f.state === 'atk' ? !!(f.move && f.move.low) : (f.crouch && (f.state === 'idle' || f.state === 'block' || f.state === 'hit' || f.state === 'rec'));
function hurt(d) {
  if (d.inv > 0 || d.hp <= 0 || d.state === 'down' || d.state === 'getup' || d.state === 'trapped' || d.state === 'win' || d.state === 'wait' || (d.state === 'airhit' && d.juggle >= 3)) return null;
  return [d.x - 11, d.y, 22, isLow(d) ? 46 : 68];
}
function checkHits(a, d) {
  if (a.state !== 'atk' || !a.move || !a.move.hits) return;
  const mf = a.mf - 1, hs = a.move.hits;
  for (let i = 0; i < hs.length; i++) {
    const h = hs[i]; if (mf < h.f0 || mf > h.f1 || a.hitDone[i]) continue;
    const hb = hurt(d); if (!hb) return;
    const bx = a.face > 0 ? a.x + h.box[0] : a.x - h.box[0] - h.box[2], by = a.y + h.box[1];
    if (bx < hb[0] + hb[2] && bx + h.box[2] > hb[0] && by < hb[1] + hb[3] && by + h.box[3] > hb[1]) {
      a.hitDone[i] = 1; a.hitAt[i] = G.ft; a.connected = true;
      const py = clamp(by + h.box[3] / 2, hb[1] + 6, hb[1] + hb[3] - 4);
      resolveHit(a, d, h, d.x - a.face * 8, py, null);
    }
  }
}
function pushback(a, d, dirn, pu, proj) {
  d.kb = dirn * pu * 1.6;
  if (!proj && a.y <= 0 && (d.x <= G.camT + 20 || d.x >= G.camT + W - 20)) a.kb = -dirn * pu * 1.4;
}
function resolveHit(a, d, h, px, py, proj) {
  const dirn = proj && proj.vx ? sgn(proj.vx) : (d.x === a.x ? a.face : sgn(d.x - a.x)), sy = GROUND - py;
  let blocked = false;
  if ((d.state === 'idle' || d.state === 'block') && d.y <= 0 && G.phase === 'fight') {
    if (d.cpu) {
      if (Math.random() < (d.state === 'block' ? 0.92 : d.ai.blockP)) {
        const right = Math.random() < 0.8;
        if (h.lv === 'low') d.crouch = right; else if (h.lv === 'high') d.crouch = !right;
        blocked = !((h.lv === 'low' && !d.crouch) || (h.lv === 'high' && d.crouch));
      }
    } else if (d.dir === 4 || d.dir === 1) {
      blocked = h.lv === 'low' ? d.dir === 1 : h.lv === 'high' ? d.dir === 4 : true; d.crouch = d.dir === 1;
    }
  }
  if (blocked) {
    d.state = 'block'; d.st = h.bs; d.move = null; pushback(a, d, dirn, h.pu * 0.9, proj);
    if (h.chip) d.hp = Math.max(1, d.hp - h.d * 0.12);
    a.meter = Math.min(100, a.meter + 2); G.hitstop = Math.max(2, (h.stop || 6) >> 1);
    G.flashes.push({ x: px, y: sy, t: 6, k: 0 }); sfx('block'); return;
  }
  const inCombo = d.state === 'hit' || d.state === 'airhit';
  d.combo = inCombo ? d.combo + 1 : 1;
  const dmg = h.d * a.ch.dmg * Math.max(0.4, 1 - (d.combo - 1) * 0.1);
  d.hp -= dmg; a.meter = Math.min(100, a.meter + dmg * 0.11); d.meter = Math.min(100, d.meter + dmg * 0.07);
  d.flash = 3; if (h.el) d.shock = 16; d.move = null;
  if (d.y > 0 || h.launch || d.hp <= 0 || d.state === 'airhit') {
    const L = h.launch || [1.8, 4.2];
    d.juggle = d.state === 'airhit' ? d.juggle + 1 : 1; d.state = 'airhit';
    d.vx = dirn * L[0]; d.vy = L[1] * (d.juggle > 1 ? 0.85 : 1); if (d.y <= 0) d.y = 0.01;
  } else {
    d.state = 'hit'; d.st = h.hs; d.hitPose = (py - d.y < 30 && !d.crouch) ? 'hit2' : 'hit1'; pushback(a, d, dirn, h.pu, proj);
  }
  G.hitstop = h.stop || 6; if ((h.stop || 6) >= 8) G.shake = 5;
  G.flashes.push({ x: px, y: sy, t: 7, k: h.el ? 2 : 1 });
  burst(px, sy, h.el ? 10 : 6, h.el ? ['#fff', '#ffe94a', '#6ee7ff'] : ['#fff', '#ffc93a', '#ff7a3a'], 3, 0.1);
  sfx(h.sf || 'hitM');
  if (d.combo >= 2) G.combo[a.idx] = { n: d.combo, t: 80 };
  if (d.hp <= 0) { d.hp = 0; d.vy = Math.max(d.vy, 5.5); d.vx = dirn * 3; ko(); }
}
function ko() { if (G.phase !== 'fight') return; G.phase = 'ko'; G.pt = 0; G.shake = 8; sfx('ko'); }

// ---------- projectiles and particles ----------
function part(x, y, vx, vy, life, col, sz, g) { G.parts.push({ x, y, vx, vy, life, col, sz: sz || 2, g: g || 0 }); }
function burst(x, y, n, cols, sp, g) { for (let i = 0; i < n; i++) { const a = rnd(0, 6.283), s = rnd(0.5, sp); part(x, y, Math.cos(a) * s, Math.sin(a) * s, ri(8, 18), cols[ri(0, cols.length - 1)], ri(1, 3), g); } }
function spawnProj(f, o) { G.projs.push(Object.assign({ owner: f, t: 0 }, o)); }
function fireGun(f, o) {
  const mz = muzzleOf(f);
  spawnProj(f, { type: 'bullet', x: mz.x, y: mz.y, vx: f.face * o.vx, vy: o.vy || 0, life: 70, w: 9, h: 5, hit: { d: o.d, hs: o.hs || 15, bs: 10, pu: 1.6, stop: 3, lv: o.lv || 'mid', sf: 'hitM', chip: 1, launch: o.launch || null } });
  f.muz = 3; f.kb -= f.face * 0.7; sfx(f.ch.gun);
  part(mz.x - f.face * 12, GROUND - mz.y, -f.face * rnd(0.6, 1.6), -rnd(2, 3.2), 30, '#ffc93a', 2, 0.25);
}
function projHit(p) {
  const d = G.f[1 - p.owner.idx], hb = hurt(d);
  if (!hb || d.projInv > 0 || p.once) return;
  if (p.x - p.w / 2 < hb[0] + hb[2] && p.x + p.w / 2 > hb[0] && p.y - p.h / 2 < hb[1] + hb[3] && p.y + p.h / 2 > hb[1]) {
    if (p.grab) { p.dead = 1; startTrap(p.owner, d); return; }
    resolveHit(p.owner, d, p.hit, d.x - sgn(p.vx || p.owner.face) * 6, clamp(p.y, hb[1] + 6, hb[1] + hb[3] - 4), p);
    if (p.type === 'bolt') p.once = 1; else p.dead = 1;
  }
}
function updProjs() {
  for (const p of G.projs) {
    p.t++;
    if (p.type === 'bolt') {
      if (p.delay > 0) { if (--p.delay === 0) { sfx('thunder'); G.shake = 6; p.active = 6; } continue; }
      if (p.active > 0) { p.active--; projHit(p); }
      if (--p.life <= 0) p.dead = 1; continue;
    }
    p.x += p.vx; p.y += p.vy;
    if (--p.life <= 0 || p.x < G.cam - 40 || p.x > G.cam + W + 40 || p.y > 250 || p.y < 0) p.dead = 1;
    if (!p.dead) projHit(p);
  }
  for (let i = 0; i < G.projs.length; i++) for (let j = i + 1; j < G.projs.length; j++) {
    const a = G.projs[i], b = G.projs[j];
    if (a.dead || b.dead || a.owner === b.owner || a.type === 'bolt' || b.type === 'bolt') continue;
    if (Math.abs(a.x - b.x) < (a.w + b.w) / 2 + 4 && Math.abs(a.y - b.y) < (a.h + b.h) / 2) {
      a.dead = b.dead = 1; G.flashes.push({ x: (a.x + b.x) / 2, y: GROUND - a.y, t: 6, k: 0 }); sfx('block');
    }
  }
  G.projs = G.projs.filter(p => !p.dead);
}
function updParts() {
  for (const p of G.parts) { p.x += p.vx; p.y += p.vy; p.vy += p.g; p.life--; }
  G.parts = G.parts.filter(p => p.life > 0);
  for (const fl of G.flashes) fl.t--; G.flashes = G.flashes.filter(fl => fl.t > 0);
  for (let i = 0; i < 2; i++) if (G.combo[i] && --G.combo[i].t <= 0) G.combo[i] = null;
  if (G.shake > 0) G.shake--;
}
// Cody's finisher: the donut drops over the other fighter and pins their arms
function startTrap(a, d) {
  Object.assign(d, { state: 'trapped', move: null, y: 0, vy: 0, vx: 0, kb: 0, ghost: false });
  a.face = d.x >= a.x ? 1 : -1; a.y = 0; a.vy = 0;
  a.state = 'atk'; a.move = a.ch.finish; a.mf = 0; a.hitDone = []; a.connected = false; a.crouch = false;
  G.trap = { a, d }; G.hitstop = 10; G.shake = 5; sfx('crunch');
  burst(d.x, GROUND - 46, 12, ['#ff7ac0', '#fff', '#d99a4e'], 3, 0.1);
}
function finHit(a, d, base, last) {
  d.combo++;
  const dmg = base * Math.max(0.5, 1 - (d.combo - 1) * 0.06);
  d.hp -= dmg; if (!last && d.hp < 1) d.hp = 1;
  d.flash = 3; d.snap = 9; G.hitstop = last ? 14 : 6; G.shake = last ? 9 : 4;
  const px = d.x - a.face * 5, sy = GROUND - 64;
  G.flashes.push({ x: px, y: sy, t: 7, k: 1 }); burst(px, sy, last ? 14 : 6, ['#fff', '#ffc93a', '#ff7a3a'], 3, 0.1);
  sfx('hitH'); if (d.combo >= 2) G.combo[a.idx] = { n: d.combo, t: 80 };
  if (last) {
    G.trap = null; sfx('crunch');
    for (let i = 0; i < 34; i++) part(d.x + rnd(-24, 24), GROUND - 46 + rnd(-8, 8), rnd(-3.5, 3.5), rnd(-5, -1), ri(20, 40), ['#ff7ac0', '#d99a4e', '#fff', '#6ee7ff', '#ffe94a'][ri(0, 4)], ri(2, 3), 0.25);
    d.state = 'airhit'; d.juggle = 9; d.vx = a.face * 4.2; d.vy = 6.6; d.y = 0.01;
    if (d.hp <= 0) { d.hp = 0; G.donutKO = true; ko(); }
  }
}

// ---------- CPU ----------
function aiThink(f, o) {
  const ai = f.ai, A = f.ch.ai, fw = f.face > 0 ? B.R : B.L, bk = f.face > 0 ? B.L : B.R, dist = Math.abs(o.x - f.x);
  const pick = a => a[ri(0, a.length - 1)], spec = key => { ai.spec = { key, str: ri(0, 2) }; ai.plan = 'idle'; ai.t = ri(14, 30); return key === 'rise' || key === 'bolt' || key === 'charge' || key === 'roll' || key === 'blitz' ? B.MK : B.MP; };
  if (f.state === 'atk') {
    if (f.connected && f.move && f.move.cancel && !ai.canc) { ai.canc = true; if (Math.random() < 0.45) { ai.spec = { key: A.rush, str: ri(0, 2) }; return B.MP; } }
    return 0;
  }
  ai.canc = false;
  if (f.state === 'air') { if (f.vy < 1 && dist < 76 && !ai.airDone && Math.random() < 0.4) { ai.airDone = true; return Math.random() < 0.5 ? B.HK : B.HP; } return ai.hold; }
  if (f.state !== 'idle') { ai.hold = 0; return 0; }
  ai.airDone = false; ai.hold = 0;
  if (--ai.t <= 0) {
    const r = Math.random();
    const threat = G.projs.find(p => p.owner !== f && p.type !== 'bolt' && Math.abs(p.x - f.x) < 110 && sgn(p.vx) === sgn(f.x - p.x));
    if (threat) ai.plan = r < 0.55 ? 'block' : r < 0.8 ? 'jump' : 'fwd';
    else if (f.meter >= 100 && dist >= A.supD[0] && dist <= A.supD[1] && o.y <= 0 && o.state !== 'down' && r < 0.4) ai.plan = 'super';
    else if (o.y > 18 && dist < 90) ai.plan = r < 0.5 ? 'anti' : 'block';
    else if (o.state === 'atk' && dist < 90) ai.plan = r < 0.6 ? 'block' : 'attack';
    else if (o.state === 'down' || o.state === 'getup') ai.plan = dist > 80 ? 'fwd' : 'idle';
    else if (dist > 190) ai.plan = r < 0.4 ? 'fwd' : r < 0.8 ? 'zone' : r < 0.92 ? 'jumpf' : 'idle';
    else if (dist > 80) ai.plan = r < 0.34 ? 'fwd' : r < 0.54 ? 'zone' : r < 0.66 ? 'jumpf' : r < 0.76 ? 'back' : r < 0.9 ? 'rush' : 'idle';
    else ai.plan = r < 0.5 ? 'attack' : r < 0.68 ? 'low' : r < 0.78 ? 'back' : r < 0.88 ? 'rush' : 'block';
    ai.t = ri(8, 22);
  }
  switch (ai.plan) {
    case 'fwd': return fw;
    case 'back': case 'block': return bk;
    case 'jump': ai.plan = 'idle'; return B.U;
    case 'jumpf': ai.plan = 'idle'; ai.hold = fw; return B.U | fw;
    case 'attack': if (dist > 64) return fw; ai.plan = 'idle'; ai.t = ri(6, 16); return pick([B.LP, B.MP, B.HP, B.LK, B.MK, B.HK]);
    case 'low': if (dist > 64) return fw; ai.plan = 'idle'; ai.t = ri(6, 16); return B.D | pick([B.LK, B.MK, B.HK]);
    case 'zone': return spec(pick(A.zone));
    case 'rush': return spec(A.rush);
    case 'anti': return spec(A.anti);
    case 'super': return spec(A.sup);
  }
  return 0;
}

// ---------- match flow ----------
function startMatch() {
  const s = G.sel;
  G.f = [newFighter(0, s[0].i, false, G.mode === 'demo'), newFighter(1, s[1].i, s[1].i === s[0].i, G.mode !== 'pvp')];
  G.round = 1; G.scene = 'fight'; MUS.step = 0; startRound();
}
function startRound() {
  for (const f of G.f) resetFighter(f);
  Object.assign(G, { projs: [], parts: [], flashes: [], phase: 'intro', pt: 0, timer: 99, hitstop: 0, freeze: 0, trap: null, combo: [null, null], cam: CAM_MAX / 2, camT: CAM_MAX / 2, donutKO: false, timeUp: false, rw: null, perfect: false, shake: 0 });
  sfx('round');
}
function fightUpdate(inp) {
  const a = G.f[0], b = G.f[1];
  G.rt++; G.pt++;
  for (const f of G.f) recInput(f, G.phase === 'fight' ? (f.cpu ? aiThink(f, G.f[1 - f.idx]) : inp[f.idx]) : 0);
  if (G.phase === 'intro') { if (G.pt === 60) sfx('ok'); if (G.pt >= 96) { G.phase = 'fight'; G.pt = 0; a.state = b.state = 'idle'; } }
  else if (G.phase === 'fight') {
    if (!G.trap && G.freeze <= 0 && G.pt % 60 === 0) { G.timer--; if (G.timer <= 10 && G.timer > 0) sfx('tick'); if (G.timer <= 0) { G.timer = 0; G.timeUp = true; G.phase = 'ko'; G.pt = 0; sfx('ko'); } }
  } else if (G.phase === 'ko') {
    if (G.pt === 75) {
      let w; if (G.timeUp) { const ra = a.hp / a.ch.hp, rb = b.hp / b.ch.hp; w = ra > rb ? 0 : rb > ra ? 1 : -1; } else w = a.hp > 0 && b.hp <= 0 ? 0 : b.hp > 0 && a.hp <= 0 ? 1 : -1;
      G.rw = w; if (w < 0) { a.wins++; b.wins++; } else { G.f[w].wins++; G.perfect = G.f[w].hp >= G.f[w].ch.hp; }
    }
    if (G.pt > 75 && G.rw >= 0 && G.f[G.rw].state === 'idle') G.f[G.rw].state = 'win';
    if (G.pt > 240) {
      if (a.wins >= 2 || b.wins >= 2 || G.round >= 5) { G.winner = a.wins > b.wins ? 0 : b.wins > a.wins ? 1 : -1; G.scene = 'over'; G.t = 0; return; }
      G.round++; startRound(); return;
    }
  }
  if (G.freeze > 0) { G.freeze--; updParts(); return; }
  if (G.hitstop > 0) { G.hitstop--; updParts(); return; }
  if (G.phase === 'ko' && G.pt < 50 && (G.rt & 1)) return;
  G.ft++;
  updFighter(a, b); updFighter(b, a);
  physics(a); physics(b); pushApart(a, b); bounds(a); bounds(b);
  checkHits(a, b); checkHits(b, a);
  if (G.trap && (G.trap.a.state !== 'atk' || G.trap.a.move !== G.trap.a.ch.finish)) { if (G.trap.d.state === 'trapped') G.trap.d.state = 'idle'; G.trap = null; }
  updProjs(); updParts();
  G.camT = clamp((a.x + b.x) / 2 - W / 2, 0, CAM_MAX);
  G.cam += (G.camT - G.cam) * 0.25;
}

// ---------- drawing ----------
function drawFighter(f, cam) {
  const sx = Math.round(f.x - cam), gy = GROUND - Math.round(f.y), sw = Math.max(8, 14 - f.y / 8);
  ctx.globalAlpha = 0.35; R(ctx, sx - sw, GROUND, sw * 2, 3, '#000'); R(ctx, sx - sw + 3, GROUND - 1, sw * 2 - 6, 5, '#000'); ctx.globalAlpha = 1;
  for (const tr of f.trail) { ctx.globalAlpha = tr.t / 18; drawRig(ctx, Math.round(tr.x - cam), GROUND - Math.round(tr.y), tr.face, tr.pose, f.ch, PAL_G, 0, false); }
  ctx.globalAlpha = 1;
  let pal = f.pal;
  if (f.flash > 0 || (f.glow > 0 && (G.rt & 1))) pal = PAL_W; else if (f.shock > 0 && (G.rt & 2)) pal = PAL_S;
  const k = drawRig(ctx, sx, gy, f.face, f.pose, f.ch, pal, G.rt, f.muz > 0);
  const hx = sx + f.face * k.fa[2][0], hy = gy - k.fa[2][1];
  if (f.ch.id === 'nic' && f.hp > 0 && f.state !== 'down') {
    if (G.rt % 3 === 0) { R(ctx, hx + ri(-4, 4), hy + ri(-4, 4), 1, 1, '#fff'); R(ctx, hx + ri(-5, 5), hy + ri(-5, 5), 2, 1, pal.acc); }
    if (G.rt % 11 < 2) jag(ctx, hx, hy, sx + f.face * k.ba[2][0], gy - k.ba[2][1], '#fff36a', 3, 1);
  }
  if (f.ch.id === 'eli' && f.charge >= 40 && (G.rt & 2)) for (let i = 0; i < 4; i++) R(ctx, sx + ri(-14, 14), GROUND - ri(0, 30), 1, 3, '#fff');
  if (f.state === 'atk' && f.move) {
    const mv = f.move, mf = f.mf - 1;
    if (mv.beam && mf >= mv.beam[0] && mf < mv.beam[1]) {
      const x0 = sx + f.face * 30, x1 = f.face > 0 ? W + 8 : -8, y = GROUND - 46, lx = Math.min(x0, x1), len = Math.abs(x1 - x0), th = 5 + (G.rt & 3);
      R(ctx, lx, y - th, len, th * 2, '#fff36a'); R(ctx, lx, y - th + 3, len, th * 2 - 6, '#fff');
      for (let i = 0; i < 4; i++) jag(ctx, x0, y + ri(-6, 6), x1, y + ri(-14, 14), i % 2 ? '#6ee7ff' : '#fff36a', 10, 1);
    } else if (mv.hits) for (const h of mv.hits) if (h.el && mf >= h.f0 - 1 && mf <= h.f1 + 2) {
      const bx = sx + f.face * (h.box[0] + h.box[2]), by = gy - h.box[1] - h.box[3] / 2;
      jag(ctx, sx + f.face * 8, by + ri(-4, 4), bx, by + ri(-6, 6), '#fff36a', 5, 2); jag(ctx, sx + f.face * 8, by, bx, by + ri(-6, 6), '#fff', 4, 1);
    }
  }
}
function drawProj(p, cam) {
  const x = Math.round(p.x - cam), y = GROUND - Math.round(p.y);
  if (p.type === 'bullet') {
    const n = Math.hypot(p.vx, p.vy) || 1, ux = p.vx / n, uy = -p.vy / n;
    stamp(ctx, x - ux * 12, y - uy * 12, x - ux * 3, y - uy * 3, 1, '#ffb020'); stamp(ctx, x - ux * 3, y - uy * 3, x + ux * 3, y + uy * 3, 2, '#fff7c0');
  } else if (p.type === 'volt') {
    disc(ctx, x, y, 7, (p.t & 2) ? '#fff36a' : '#ffd020'); disc(ctx, x, y, 3, '#fff');
    jag(ctx, x, y, x + ri(-12, 12), y + ri(-12, 12), '#fff', 3, 1); jag(ctx, x, y, x + ri(-12, 12), y + ri(-12, 12), '#6ee7ff', 3, 1);
  } else if (p.type === 'donut') drawDonut(ctx, x, y, 10, p.t * 0.45);
  else if (p.type === 'bolt') {
    if (p.delay > 0) { if (p.t & 2) { R(ctx, x - 11, GROUND - 1, 22, 2, '#fff36a'); R(ctx, x, 0, 1, GROUND, 'rgba(255,243,106,0.35)'); } }
    else if (p.life > 16) {
      jag(ctx, x + ri(-8, 8), 0, x, GROUND, '#fff36a', 9, 5); jag(ctx, x + ri(-8, 8), 0, x, GROUND, '#fff', 7, 2); jag(ctx, x + ri(-20, 20), 0, x, GROUND, '#6ee7ff', 14, 1);
      R(ctx, x - 16, GROUND - 3, 32, 4, '#fff');
    }
  }
}
function drawFlash(fl, cam) {
  const x = Math.round(fl.x - cam), y = Math.round(fl.y), s = fl.t * 2, c1 = fl.k === 0 ? '#8fd8ff' : fl.k === 2 ? '#fff36a' : '#ffc93a';
  R(ctx, x - s, y - 1, s * 2, 3, c1); R(ctx, x - 1, y - s, 3, s * 2, c1);
  R(ctx, x - s / 2, y - s / 2, s, s, '#fff');
}
function bigText(s, y, sc, c0) {
  const grad = c0 || (r => ['#fffbe0', '#fff36a', '#ffd92a', '#ffb020', '#ff7a2a', '#ff3d3d', '#c0104a'][r]);
  text(ctx, s, 192 + sc, y + sc, '#12061e', sc, 1); text(ctx, s, 192, y, grad, sc, 1);
}
function drawHud() {
  const a = G.f[0], b = G.f[1], bw = 152;
  for (const f of G.f) {
    const x = f.idx ? 216 : 16, hw = Math.round(bw * Math.max(0, f.hp) / f.ch.hp), sw = Math.round(bw * Math.max(0, f.hpShow) / f.ch.hp);
    R(ctx, x - 2, 12, bw + 4, 13, '#12061e'); R(ctx, x - 1, 13, bw + 2, 11, '#fff'); R(ctx, x, 14, bw, 9, '#6a0c1c');
    const hx = f.idx ? x : x + bw - hw, sx2 = f.idx ? x : x + bw - sw;
    R(ctx, sx2, 14, sw, 9, '#ff5a3a'); R(ctx, hx, 14, hw, 9, hw < bw * 0.25 && (G.rt & 8) ? '#ff9a2a' : '#ffd92a'); R(ctx, hx, 14, hw, 3, '#fff7a0');
    text(ctx, f.ch.name + (f.cpu && G.mode !== 'demo' ? ' (CPU)' : ''), f.idx ? 368 : 16, 27, '#fff', 1, f.idx ? 2 : 0, '#12061e');
    for (let i = 0; i < 2; i++) { const wx = f.idx ? 216 + i * 10 : 161 - i * 10; R(ctx, wx, 36, 8, 8, '#12061e'); R(ctx, wx + 1, 37, 6, 6, f.wins > i ? '#ffd92a' : '#3a2a4a'); }
    const mx = f.idx ? 288 : 16, mw = Math.round(80 * f.meter / 100), full = f.meter >= 100;
    R(ctx, mx - 1, 211, 82, 7, '#12061e'); R(ctx, mx, 212, 80, 5, '#1a2a4a');
    R(ctx, f.idx ? mx + 80 - mw : mx, 212, mw, 5, full ? ((G.rt & 4) ? '#fff' : '#ffd92a') : '#2fd6e8');
    if (full) text(ctx, 'SUPER', f.idx ? 368 : 16, 202, (G.rt & 8) ? '#ffd92a' : '#fff', 1, f.idx ? 2 : 0, '#12061e');
    const c = G.combo[f.idx];
    if (c) { text(ctx, c.n + ' HITS', f.idx ? 368 : 16, 50, '#ffe94a', 2, f.idx ? 2 : 0, '#a01040'); }
  }
  R(ctx, 178, 9, 28, 20, '#12061e'); R(ctx, 179, 10, 26, 18, '#2a1a3a');
  text(ctx, String(G.timer).padStart(2, '0'), 193, 12, G.timer <= 10 && (G.rt & 8) ? '#ff3d3d' : '#ffe94a', 2, 1);
  text(ctx, 'CREDIT ' + String(G.credits).padStart(2, '0'), 192, 214, '#fff', 1, 1, '#12061e');
}
function drawFight() {
  const st = STAGES[G.stage], shx = G.shake > 0 ? ri(-2, 2) : 0, shy = G.shake > 0 ? ri(-2, 2) : 0, cam = Math.round(G.cam) + shx;
  ctx.save(); ctx.translate(0, shy);
  drawStage(ctx, st, clamp(cam, 0, CAM_MAX), G.rt);
  if (G.freeze > 0) {
    ctx.globalAlpha = 0.62; R(ctx, 0, -4, W, H + 8, '#05030f'); ctx.globalAlpha = 1;
    for (let i = 0; i < 14; i++) R(ctx, (i * 97 + G.rt * 23) % (W + 60) - 60, (i * 41) % H, 50, 1, i % 2 ? '#ffd92a' : '#fff');
  }
  for (const p of G.projs) if (p.type === 'bolt') drawProj(p, cam);
  const order = G.f[0].state === 'atk' && G.f[1].state !== 'atk' ? [G.f[1], G.f[0]] : [G.f[0], G.f[1]];
  if (G.trap) drawTrapDonut(ctx, Math.round(G.trap.d.x - cam), GROUND - 46, 0);
  for (const f of order) { drawFighter(f, cam); if (G.trap && G.trap.d === f) drawTrapDonut(ctx, Math.round(f.x - cam), GROUND - 46, 1); }
  for (const p of G.projs) if (p.type !== 'bolt') drawProj(p, cam);
  for (const p of G.parts) R(ctx, p.x - cam, p.y, p.sz, p.sz, p.col);
  for (const fl of G.flashes) drawFlash(fl, cam);
  ctx.restore();
  drawHud();
  if (G.freeze > 0) text(ctx, G.superName, 192, 60, (G.rt & 4) ? '#fff' : '#ffd92a', 2, 1, '#a01040');
  if (G.phase === 'intro') {
    if (G.pt < 60) bigText(G.f[0].wins === 1 && G.f[1].wins === 1 ? 'FINAL ROUND' : 'ROUND ' + G.round, 86, 3);
    else bigText('FIGHT!', 80, 4 + (G.pt < 66 ? 1 : 0));
  } else if (G.phase === 'ko') {
    if (G.pt < 75) { if (G.pt > 4 || (G.rt & 1)) bigText(G.timeUp ? 'TIME OVER' : G.donutKO ? 'DONUT FINISH' : 'K.O.', 82, G.timeUp || G.donutKO ? 3 : 5); }
    else if (G.pt > 90) {
      bigText(G.rw < 0 ? 'DRAW GAME' : G.f[G.rw].ch.name + ' WINS', 78, 3);
      if (G.perfect && G.pt > 120) text(ctx, 'PERFECT', 192, 110, (G.rt & 4) ? '#fff' : '#6ee7ff', 2, 1, '#12061e');
    }
  }
  if (G.mode === 'demo') {
    text(ctx, 'DEMO', 192, 37, '#fff', 1, 1, '#12061e');
    if ((G.rt >> 5) & 1) text(ctx, 'INSERT COIN', 192, 186, '#ffe94a', 2, 1, '#12061e');
  }
}
function gridBg(c0, c1) {
  R(ctx, 0, 0, W, H, c0);
  for (let y = 0; y < H + 16; y += 16) R(ctx, 0, (y + (G.t >> 1)) % (H + 16) - 8, W, 1, c1);
  for (let x = 0; x < W + 16; x += 16) R(ctx, (x + (G.t >> 1)) % (W + 16) - 8, 0, 1, H, c1);
}
function drawBigRig(ch, pal, x, y, face, pose, sc) { ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc); drawRig(ctx, 0, 0, face, pose, ch, pal, G.t, false); ctx.restore(); }
const P1C = '#ff3d6e', P2C = '#2fd6e8';

// ---------- screens ----------
function goTitle() { G.scene = 'title'; G.t = 0; G.mode = 'cpu'; }
function begin(mode) {
  G.credits--; G.mode = mode; G.ladder = null; G.lpos = 0; G.wait = 0; G.roll = 0;
  G.sel[0].ok = G.sel[1].ok = false; G.scene = 'select'; G.t = 0; sfx('ok');
}
function startDemo() {
  G.mode = 'demo'; G.sel[0].i = ri(0, 3); G.sel[1].i = (G.sel[0].i + ri(1, 3)) % 4; G.stage = ri(0, 4); startMatch();
}
const SCENES = {
  title: {
    upd(inp, pr) {
      if (G.credits > 0) { if (pr[0] & B.ST) begin('cpu'); else if (pr[1] & B.ST) begin('pvp'); }
      else if (G.t > 540) startDemo();
    },
    draw() {
      drawStage(ctx, STAGES[4], 128 + Math.sin(G.t / 240) * 110, G.t);
      ctx.globalAlpha = 0.6; R(ctx, 0, 0, W, H, '#0a0618'); ctx.globalAlpha = 0.75; R(ctx, 0, 0, W, 126, '#0a0618'); ctx.globalAlpha = 1;
      const grad = r => ['#fffbe0', '#fff36a', '#ffd92a', '#ffb020', '#ff7a2a', '#ff3d3d', '#c0104a'][r];
      text(ctx, 'LAST', 196, 28, '#12061e', 5, 1); text(ctx, 'LAST', 192, 24, grad, 5, 1);
      text(ctx, 'QUARTER', 196, 68, '#12061e', 5, 1); text(ctx, 'QUARTER', 192, 64, grad, 5, 1);
      R(ctx, 86, 104, 212, 2, P1C); R(ctx, 86, 108, 212, 1, P2C);
      text(ctx, 'TWO PLAYER VERSUS FIGHTING', 192, 115, '#fff', 1, 1, '#12061e');
      CHARS.forEach((ch, i) => drawBigRig(ch, ch.pal, [30, 74, 310, 354][i], 206, i < 2 ? 1 : -1, (G.t >> 4) & 1 ? ch.poses.idle2 : ch.poses.idle, 1));
      if (G.credits > 0) {
        if ((G.t >> 4) & 1) text(ctx, 'PRESS START', 192, 134, '#ffe94a', 2, 1, '#12061e');
        text(ctx, '1P START - VS CPU', 192, 158, P1C, 1, 1, '#12061e'); text(ctx, '2P START - VS PLAYER', 192, 170, P2C, 1, 1, '#12061e');
      } else {
        if ((G.t >> 5) & 1) text(ctx, 'INSERT COIN', 192, 136, '#ffe94a', 2, 1, '#12061e');
        text(ctx, 'COIN = 5 KEY    START = 1 KEY', 192, 164, '#fff', 1, 1, '#12061e');
      }
      text(ctx, 'CREDIT ' + String(G.credits).padStart(2, '0'), 192, 214, '#fff', 1, 1, '#12061e');
      text(ctx, 'BUILD 0.1', 192, 200, '#9a8fb8', 1, 1);
    }
  },
  select: {
    upd(inp, pr) {
      const n = G.mode === 'pvp' ? 2 : 1;
      for (let p = 0; p < n; p++) {
        const s = G.sel[p]; if (s.ok) continue;
        if (pr[p] & B.L) { s.i = (s.i + 3) % 4; sfx('sel'); } if (pr[p] & B.R) { s.i = (s.i + 1) % 4; sfx('sel'); }
        if ((pr[p] & ATK) || G.t > 1200) { s.ok = true; sfx('ok'); }
      }
      if (G.mode === 'cpu') {
        const s = G.sel[1];
        if (!G.sel[0].ok) s.i = (G.t >> 3) % 4;
        else if (!s.ok) {
          if (!G.ladder) { const me = G.sel[0].i, rest = [0, 1, 2, 3].filter(i => i !== me); for (let i = rest.length - 1; i > 0; i--) { const j = ri(0, i), tmp = rest[i]; rest[i] = rest[j]; rest[j] = tmp; } G.ladder = rest.concat([me]); G.lpos = 0; }
          s.i = (G.t >> 2) % 4; if (G.t % 4 === 0) sfx('sel');
          if (++G.roll > 44) { s.i = G.ladder[G.lpos]; s.ok = true; sfx('ok'); }
        }
      }
      if (G.sel[0].ok && G.sel[1].ok && ++G.wait > 46) { G.scene = 'stage'; G.t = 0; }
    },
    draw() {
      gridBg('#120a26', '#1e1240');
      text(ctx, 'PLAYER SELECT', 192, 6, '#ffd92a', 2, 1, '#a01040');
      if (!(G.sel[0].ok && G.sel[1].ok)) text(ctx, String(Math.max(0, 20 - Math.floor(G.t / 60))).padStart(2, '0'), 192, 26, '#fff', 1, 1);
      for (let p = 0; p < 2; p++) {
        const s = G.sel[p], ch = CHARS[s.i], alt = p === 1 && s.i === G.sel[0].i;
        drawBigRig(ch, alt ? ch.pal2 : ch.pal, p ? 346 : 38, 188, p ? -1 : 1, s.ok ? ch.poses.win : ((G.t >> 4) & 1 ? ch.poses.idle2 : ch.poses.idle), 2);
      }
      for (let i = 0; i < 4; i++) {
        const x = 88 + i * 52, y = 44;
        R(ctx, x, y, 52, 52, '#05030f'); ctx.drawImage(PORTRAITS[i][0], x + 2, y + 2);
        text(ctx, CHARS[i].name, x + 26, y + 56, '#fff', 1, 1, '#05030f');
      }
      for (let p = 0; p < 2; p++) {
        const s = G.sel[p], ch = CHARS[s.i], col = p ? P2C : P1C, x = 88 + s.i * 52, y = 44, in2 = p ? 3 : 0, alt = p === 1 && s.i === G.sel[0].i;
        if (s.ok || (G.t & 4)) { R(ctx, x + in2, y + in2, 52 - in2 * 2, 2, col); R(ctx, x + in2, y + 50 - in2, 52 - in2 * 2, 2, col); R(ctx, x + in2, y + in2, 2, 52 - in2 * 2, col); R(ctx, x + 50 - in2, y + in2, 2, 52 - in2 * 2, col); }
        text(ctx, p ? (G.mode === 'cpu' ? 'CPU' : '2P') : '1P', x + (p ? 40 : 12), y - 9, col, 1, 1, '#05030f');
        text(ctx, ch.name, p ? W - 8 : 8, 22, col, 2, p ? 2 : 0, '#05030f');
        text(ctx, ch.title, p ? W - 8 : 8, 38, '#fff', 1, p ? 2 : 0, '#05030f');
        ['PWR', 'SPD', 'RNG'].forEach((lb, k) => {
          const sx = p ? 322 : 8, sy = 200 + k * 8; text(ctx, lb, sx, sy, '#9a8fb8', 1);
          for (let q = 0; q < 5; q++) R(ctx, sx + 22 + q * 6, sy + 1, 5, 5, q < ch.stats[k] ? col : '#2a1c4a');
        });
      }
      const who = G.mode === 'pvp' ? (G.t >> 7) & 1 : 0, mc = CHARS[G.sel[who].i];
      text(ctx, mc.name + ' SPECIALS', 192, 118, who ? P2C : P1C, 1, 1, '#05030f');
      mc.specials.slice().reverse().forEach((sp, k) => {
        text(ctx, sp.name, 190, 130 + k * 10, sp.cost ? '#ffd92a' : '#fff', 1, 2, '#05030f'); text(ctx, sp.cmd, 198, 130 + k * 10, '#9a8fb8', 1, 0);
      });
      text(ctx, 'P = ANY PUNCH   K = ANY KICK', 192, 174, '#6a5f88', 1, 1);
      text(ctx, 'GOLD MOVE NEEDS FULL SUPER BAR', 192, 184, '#6a5f88', 1, 1);
    }
  },
  stage: {
    upd(inp, pr) {
      const any = G.mode === 'pvp' ? (pr[0] | pr[1]) : pr[0];
      if (any & B.L) { G.stage = (G.stage + 4) % 5; sfx('sel'); } if (any & B.R) { G.stage = (G.stage + 1) % 5; sfx('sel'); }
      if ((G.t > 12 && (any & ATK)) || G.t > 900) { G.scene = 'vs'; G.t = 0; sfx('ok'); }
    },
    draw() {
      gridBg('#0a1626', '#12243c');
      text(ctx, 'STAGE SELECT', 192, 8, '#ffd92a', 2, 1, '#a01040');
      drawStage(tmpX, STAGES[G.stage], 128, G.t);
      R(ctx, 93, 37, 198, 118, '#fff'); R(ctx, 94, 38, 196, 116, '#05030f');
      ctx.drawImage(tmpC, 0, 0, W, H, 96, 40, 192, 112);
      if ((G.t >> 3) & 1) { text(ctx, '<', 76, 90, '#fff', 2, 1); text(ctx, '>', 308, 90, '#fff', 2, 1); }
      text(ctx, STAGES[G.stage].name, 192, 164, '#fff', 2, 1, '#05030f');
      for (let i = 0; i < 5; i++) R(ctx, 172 + i * 9, 186, 6, 6, i === G.stage ? '#ffd92a' : '#2a3a5a');
      text(ctx, 'STICK: CHOOSE    ANY BUTTON: FIGHT', 192, 204, '#8fa8c8', 1, 1);
    }
  },
  vs: {
    upd(inp, pr) { if (G.t === 2) sfx('super'); if (G.t > 130 || (G.t > 30 && ((pr[0] | pr[1]) & ATK))) startMatch(); },
    draw() {
      R(ctx, 0, 0, W, H, '#3a0c26'); for (let y = 0; y < H; y++) R(ctx, 192 + 60 - y * 0.55, y, W, 1, '#0c2a3e');
      for (let i = 0; i < 10; i++) R(ctx, (i * 61 + G.t * 9) % (W + 80) - 80, 20 + i * 19, 70, 1, i % 2 ? '#ffffff' : '#ffd92a');
      const s = G.sel, a = CHARS[s[0].i], b = CHARS[s[1].i], alt = s[1].i === s[0].i, sl = Math.max(0, 20 - G.t) * 10;
      R(ctx, 30 - sl, 38, 100, 100, '#fff'); ctx.drawImage(PORTRAITS[s[0].i][0], 0, 0, 48, 48, 32 - sl, 40, 96, 96);
      R(ctx, 254 + sl, 38, 100, 100, '#fff'); ctx.save(); ctx.translate(352 + sl, 40); ctx.scale(-1, 1); ctx.drawImage(PORTRAITS[s[1].i][alt ? 1 : 0], 0, 0, 48, 48, 0, 0, 96, 96); ctx.restore();
      text(ctx, a.name, 80, 146, P1C, 2, 1, '#05030f'); text(ctx, b.name, 304, 146, P2C, 2, 1, '#05030f');
      text(ctx, a.title, 80, 164, '#fff', 1, 1, '#05030f'); text(ctx, b.title, 304, 164, '#fff', 1, 1, '#05030f');
      if (G.t > 18) bigText('VS', 70, 5);
      text(ctx, STAGES[G.stage].name, 192, 190, '#ffd92a', 1, 1, '#05030f');
      if (G.mode === 'cpu' && G.ladder) text(ctx, 'FIGHT ' + (G.lpos + 1) + ' OF ' + G.ladder.length, 192, 204, '#fff', 1, 1, '#05030f');
    }
  },
  fight: {
    upd(inp, pr) {
      if (G.mode === 'demo') { if (G.credits > 0) { goTitle(); return; } }
      else if (G.mode === 'cpu' && (pr[1] & B.ST) && G.credits > 0) { G.credits--; G.mode = 'pvp'; G.scene = 'challenger'; G.t = 0; sfx('super'); return; }
      fightUpdate(inp); if (G.scene === 'fight' && G.mode !== 'demo') musicTick(STAGES[G.stage].mus);
    },
    draw: drawFight
  },
  challenger: {
    upd() { if (G.t > 120) { G.sel[0].ok = G.sel[1].ok = false; G.wait = 0; G.scene = 'select'; G.t = 0; } },
    draw() {
      drawFight(); ctx.globalAlpha = 0.7; R(ctx, 0, 70, W, 70, '#05030f'); ctx.globalAlpha = 1;
      if ((G.t >> 3) & 1) { text(ctx, 'HERE COMES', 192, 82, '#fff', 2, 1, '#a01040'); text(ctx, 'A NEW CHALLENGER', 192, 106, '#ffd92a', 2, 1, '#a01040'); }
    }
  },
  over: {
    upd(inp, pr) {
      if (G.t === 1) sfx('round');
      if (!(G.t > 420 || (G.t > 70 && ((pr[0] | pr[1]) & (ATK | B.ST))))) return;
      if (G.mode === 'demo') { goTitle(); return; }
      if (G.mode === 'pvp') { G.sel[0].ok = G.sel[1].ok = false; G.wait = 0; G.scene = 'select'; G.t = 0; return; }
      if (G.winner === 0) {
        G.lpos++;
        if (G.lpos >= G.ladder.length) { G.scene = 'ending'; G.t = 0; return; }
        G.sel[1].i = G.ladder[G.lpos]; G.stage = (G.stage + 1) % 5; G.scene = 'vs'; G.t = 0;
      } else { G.scene = 'cont'; G.t = 0; }
    },
    draw() {
      gridBg('#1a0a1e', '#2a1230');
      if (G.winner < 0) { bigText('DRAW GAME', 90, 3); return; }
      const wf = G.f[G.winner], col = G.winner ? P2C : P1C;
      R(ctx, 22, 30, 100, 100, col); ctx.drawImage(PORTRAITS[wf.ci][wf.alt ? 1 : 0], 0, 0, 48, 48, 24, 32, 96, 96);
      text(ctx, 'WINNER', 136, 34, '#ffd92a', 2, 0, '#a01040'); text(ctx, wf.ch.name, 136, 56, col, 3, 0, '#05030f');
      wrap(wf.ch.quote, 34).forEach((ln, i) => text(ctx, ln.slice(0, Math.max(0, Math.floor(G.t / 2) - i * 34)), 136, 92 + i * 11, '#fff', 1, 0, '#05030f'));
      drawBigRig(wf.ch, wf.pal, 320, 206, -1, wf.ch.poses.win, 1);
      text(ctx, G.f[0].wins + ' - ' + G.f[1].wins, 72, 140, '#fff', 2, 1, '#05030f');
      if (G.t > 70 && (G.t >> 4) & 1) text(ctx, 'PRESS ANY BUTTON', 192, 196, '#fff', 1, 1, '#05030f');
    }
  },
  cont: {
    upd(inp, pr) {
      if ((pr[0] & B.ST) && G.credits > 0) { G.credits--; G.scene = 'vs'; G.t = 0; sfx('ok'); return; }
      if (pr[0] & ATK) G.t = Math.ceil((G.t + 1) / 60) * 60;
      if (G.t % 60 === 0) sfx('tick');
      if (G.t >= 600) { G.scene = 'gameover'; G.t = 0; sfx('ko'); }
    },
    draw() {
      gridBg('#0e0a14', '#1c1424');
      text(ctx, 'CONTINUE?', 192, 40, '#fff', 3, 1, '#a01040');
      bigText(String(Math.max(0, 9 - Math.floor(G.t / 60))), 78, 8);
      text(ctx, G.credits > 0 ? 'PRESS 1P START' : 'INSERT COIN', 192, 156, (G.t >> 4) & 1 ? '#ffe94a' : '#fff', 2, 1, '#05030f');
      text(ctx, 'CREDIT ' + String(G.credits).padStart(2, '0'), 192, 214, '#fff', 1, 1);
    }
  },
  gameover: {
    upd() { if (G.t > 220) goTitle(); },
    draw() { R(ctx, 0, 0, W, H, '#05030f'); bigText('GAME OVER', 90, 4); }
  },
  ending: {
    upd(inp, pr) { if (G.t > 720 || (G.t > 90 && ((pr[0] | pr[1]) & B.ST))) goTitle(); },
    draw() {
      gridBg('#0a1626', '#12243c'); const ch = CHARS[G.sel[0].i];
      bigText('CONGRATULATIONS', 20, 2);
      drawBigRig(ch, ch.pal, 192, 170, 1, ch.poses.win, 2);
      text(ctx, ch.name + ' HOLDS THE LAST QUARTER', 192, 184, '#fff', 1, 1, '#05030f');
      text(ctx, 'THANKS FOR PLAYING', 192, 198, '#ffd92a', 1, 1, '#05030f');
    }
  }
};

// ---------- main loop ----------
function step() {
  pollPads();
  const inp = [readInput(0), readInput(1)], pr = [inp[0] & ~G.prev[0], inp[1] & ~G.prev[1]];
  G.prev = inp; G.frame++; G.t++;
  if ((pr[0] | pr[1]) & B.CO) { if (G.credits < 9) G.credits++; sfx('coin'); }
  SCENES[G.scene].upd(inp, pr);
}
function draw() { ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; SCENES[G.scene].draw(); }
let lastTs = 0, acc = 0;
function loop(ts) {
  requestAnimationFrame(loop);
  const dt = Math.min(100, ts - lastTs || 16.7); lastTs = ts; acc += dt;
  let n = 0; while (acc >= 16.6667 && n < 4) { step(); acc -= 16.6667; n++; }
  if (n === 4) acc = 0;
  draw(); uiLive();
}

// ---------- cabinet control panel (also works by touch) ----------
const KEYNAME = c => c.replace('Key', '').replace('Digit', '').replace('Numpad', 'N').replace('ArrowUp', '↑').replace('ArrowDown', '↓').replace('ArrowLeft', '←').replace('ArrowRight', '→').replace('Semicolon', ';');
const keyFor = (p, bit) => { const m = LAYOUTS[layout][p]; for (const c in m) if (m[c] === bit) return KEYNAME(c); return ''; };
const BTNS = [['LP', 16], ['MP', 32], ['HP', 64], ['LK', 128], ['MK', 256], ['HK', 512]];
function buildPanel() {
  for (let p = 0; p < 2; p++) {
    const deck = document.getElementById('deck' + p); if (!deck) return;
    deck.innerHTML = '<div class="plabel">PLAYER ' + (p + 1) + '</div><div class="controls"><div class="stickwrap"><div class="stick" data-p="' + p + '"><div class="ball"></div></div><div class="skeys" id="sk' + p + '"></div></div><div class="btns">' +
      BTNS.map(b => '<button type="button" class="ab" id="ab' + p + '_' + b[1] + '" data-p="' + p + '" data-b="' + b[1] + '"><b></b><i>' + b[0] + '</i></button>').join('') + '</div></div>';
  }
  document.querySelectorAll('[data-b]').forEach(el => {
    const p = +el.dataset.p, b = +el.dataset.b;
    const up = () => { virt[p] &= ~b; };
    el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); virt[p] |= b; try { el.setPointerCapture(e.pointerId); } catch (x) { } });
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
    el.addEventListener('contextmenu', e => e.preventDefault());
  });
  document.querySelectorAll('.stick').forEach(el => {
    const p = +el.dataset.p; let on = false;
    const set = e => {
      const r = el.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
      let s = 0; if (Math.hypot(dx, dy) > r.width * 0.14) { const a = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)); s = [B.R, B.R | B.D, B.D, B.D | B.L, B.L, B.L | B.U, B.U, B.U | B.R][(a + 8) % 8]; }
      virt[p] = (virt[p] & ~15) | s;
    };
    const up = () => { on = false; virt[p] &= ~15; };
    el.addEventListener('pointerdown', e => { e.preventDefault(); audioInit(); on = true; try { el.setPointerCapture(e.pointerId); } catch (x) { } set(e); });
    el.addEventListener('pointermove', e => { if (on) set(e); });
    el.addEventListener('pointerup', up); el.addEventListener('pointercancel', up); el.addEventListener('lostpointercapture', up);
  });
  const $ = id => document.getElementById(id);
  $('muteBtn').addEventListener('click', () => { audioInit(); muted = !muted; syncUi(); });
  $('keysBtn').addEventListener('click', () => { layout = layout === 'std' ? 'shared' : 'std'; keyState[0] = keyState[1] = 0; syncUi(); });
  $('fullBtn').addEventListener('click', () => { const el = $('crt'); try { if (document.fullscreenElement) document.exitFullscreen(); else if (el.requestFullscreen) el.requestFullscreen().catch(() => { }); } catch (x) { } });
  syncUi();
}
function syncUi() {
  const $ = id => document.getElementById(id); if (!$('muteBtn')) return;
  for (let p = 0; p < 2; p++) {
    for (const b of BTNS) $('ab' + p + '_' + b[1]).firstChild.textContent = keyFor(p, b[1]);
    $('sk' + p).textContent = p ? 'ARROW KEYS' : [1, 4, 2, 8].map(b => keyFor(p, b)).join(' ');
  }
  $('muteBtn').textContent = muted ? 'SOUND OFF' : 'SOUND ON';
  $('muteBtn').setAttribute('aria-pressed', String(!muted));
  $('keysBtn').textContent = layout === 'std' ? 'KEYS: NUMPAD' : 'KEYS: SHARED';
}
const uiPrev = [-1, -1];
function uiLive() {
  for (let p = 0; p < 2; p++) {
    const s = readInput(p); if (s === uiPrev[p]) continue; uiPrev[p] = s;
    for (const b of BTNS) { const el = document.getElementById('ab' + p + '_' + b[1]); if (el) el.classList.toggle('on', !!(s & b[1])); }
    const ball = document.querySelector('.stick[data-p="' + p + '"] .ball');
    if (ball) ball.style.transform = 'translate(' + ((s & B.R ? 1 : 0) - (s & B.L ? 1 : 0)) * 11 + 'px,' + ((s & B.D ? 1 : 0) - (s & B.U ? 1 : 0)) * 11 + 'px)';
    document.querySelectorAll('.svc[data-p="' + p + '"]').forEach(el => el.classList.toggle('on', !!(s & +el.dataset.b)));
  }
}

// ---------- boot ----------
function boot() {
  buildStages();
  PORTRAITS = CHARS.map(ch => [mkPortrait(ch, ch.pal, false), mkPortrait(ch, ch.pal2, true)]);
  const t = mkc(W, H); tmpC = t[0]; tmpX = t[1];
  buildPanel();
  requestAnimationFrame(loop);
}
boot();
