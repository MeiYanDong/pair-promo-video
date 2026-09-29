// PAIR promo film. One canvas, one draw(ctx, t) function.
// Every pixel is a pure function of absolute time t (seconds): no timers,
// no state carried between frames, so any frame can be rendered in any order.
// Runs unchanged in the browser (index.html preview) and in Node
// (@napi-rs/canvas, scripts/render.mjs).

export const W = 1920;
export const H = 1080;
export const FPS = 60;
export const BPM = 120;
export const BEAT = 60 / BPM;
export const BAR = BEAT * 4;
export const DURATION = 32;

// Brand tokens. PAIR's own palette could not be fetched from pair.fund in the
// build environment, so these are a stand-in: swap them here and re-render.
export const P = {
  bg: '#07080A',
  ink: '#F2F3EE',
  muted: '#8B919A',
  dim: '#4B5059',
  line: 'rgba(255,255,255,0.10)',
  panel: '#0F1115',
  panel2: '#161920',
  panel3: '#23272F',
  accent: '#C6FF4A',
  accentInk: '#0B0E05',
  red: '#FF5B4B',
};

const SANS = 'Geist';
const MONO = '"Geist Mono"';
const font = (weight, size, fam = SANS) => `${weight} ${size}px ${fam}`;

// Stock Tokens PAIR lists as launchable today (press release, Aug 31 2026).
export const TICKERS = [
  'AAPL', 'AMC', 'AMD', 'AMZN', 'BABA', 'BE', 'CRCL', 'CRWV',
  'GOOGL', 'INTC', 'META', 'MSFT', 'MU', 'NVDA', 'ORCL', 'PLTR',
  'QQQ', 'SGOV', 'SLV', 'SNDK', 'SPCX', 'SPY', 'TSLA', 'USAR',
];

// Scene map (seconds). 120 BPM: one beat = 0.5 s, one bar = 2 s.
export const SCENES = [
  { name: 'Hook', from: 0, to: 2 },
  { name: 'Gas coin', from: 2, to: 4 },
  { name: 'Stop launching against ETH', from: 4, to: 6 },
  { name: 'Companies that print money', from: 6, to: 8 },
  { name: 'PAIR reveal', from: 8, to: 10 },
  { name: 'Launch UI', from: 10, to: 14 },
  { name: 'One transaction, four pools', from: 14, to: 16 },
  { name: 'No curve, no ceiling, no migration', from: 16, to: 18 },
  { name: 'Same pool, year five', from: 18, to: 20 },
  { name: '1% fee, 70/30 split', from: 20, to: 22 },
  { name: 'Non-custodial', from: 22, to: 24 },
  { name: 'Traction', from: 24, to: 28 },
  { name: 'End card', from: 28, to: 32 },
];

// Windows with very fast camera moves. The renderer takes more motion-blur
// subframes here so the blur reads as a smear rather than stepped copies.
export const FAST = [
  [1.5, 2.05], [5.7, 6.35], [7.6, 8.25], [9.5, 10.3], [13.95, 14.5], [28.5, 29.3],
];

// ---------------------------------------------------------------- timing cues
// Shared with the audio synth so every sound lands on the frame it belongs to.
const NAME = 'Orbit';
const NAME_T0 = 10.25, NAME_STEP = 0.075;
const TICK = '$ORBIT';
const TICK_T0 = 10.9, TICK_STEP = 0.07;
const PICKS = [
  { tk: 'NVDA', t: 11.5 },
  { tk: 'TSLA', t: 12.0 },
  { tk: 'AAPL', t: 12.5 },
  { tk: 'SPY', t: 13.0 },
];
const LAUNCH_T = 14.0;
const SIGN_T = 22.75;
const TIMELINE_STEPS = [18.25, 18.5, 18.75, 19.0, 19.25];
const STATS_T = [24.5, 25.0, 25.5, 26.0];

export const CUES = [
  { t: 0.5, k: 'tick' }, { t: 1.0, k: 'tick' },
  { t: 1.55, k: 'whoosh' },
  { t: 2.0, k: 'thud' }, { t: 2.25, k: 'pop' }, { t: 2.4, k: 'tick' },
  { t: 4.0, k: 'thud' }, { t: 4.5, k: 'snap' },
  { t: 5.75, k: 'whoosh' }, { t: 6.0, k: 'hit' },
  { t: 7.0, k: 'pop' }, { t: 7.125, k: 'pop' }, { t: 7.25, k: 'pop' }, { t: 7.375, k: 'pop' },
  { t: 8.0, k: 'impact' },
  { t: 9.75, k: 'whoosh' },
  { t: 10.15, k: 'click' }, { t: 10.8, k: 'click' },
  ...[...NAME].map((_, i) => ({ t: NAME_T0 + i * NAME_STEP, k: 'type' })),
  ...[...TICK].map((_, i) => ({ t: TICK_T0 + i * TICK_STEP, k: 'type' })),
  ...PICKS.flatMap((p) => [{ t: p.t, k: 'click' }, { t: p.t + 0.01, k: 'select' }]),
  { t: LAUNCH_T, k: 'click' }, { t: 14.6, k: 'ding' },
  ...[0, 1, 2, 3].map((i) => ({ t: 14.8 + i * 0.12, k: 'pop' })),
  { t: 15.5, k: 'lock' },
  { t: 16.0, k: 'thud' }, { t: 16.5, k: 'thud' }, { t: 17.0, k: 'thud' },
  ...TIMELINE_STEPS.map((t) => ({ t, k: 'tick' })),
  { t: 20.0, k: 'hit' }, { t: 20.5, k: 'swipe' }, { t: 20.75, k: 'swipe' },
  { t: SIGN_T, k: 'click' }, { t: SIGN_T + 0.08, k: 'ding' },
  ...STATS_T.map((t) => ({ t, k: 'count' })),
  { t: 28.0, k: 'whoosh' },
  { t: 29.0, k: 'impact' }, { t: 30.0, k: 'ding' },
];

// ---------------------------------------------------------------- math
const clamp = (x, a = 0, b = 1) => (x < a ? a : x > b ? b : x);
const lerp = (a, b, k) => a + (b - a) * k;
const seg = (t, a, b) => clamp((t - a) / (b - a));
const easeIn3 = (k) => k * k * k;
const easeOut3 = (k) => 1 - (1 - k) ** 3;
const easeInOut3 = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
const easeOutExpo = (k) => (k >= 1 ? 1 : 1 - 2 ** (-10 * k));
const bump = (t, a, d) => Math.sin(Math.PI * seg(t, a, a + d));

// Closed-form damped spring step response: 0 before t0, settles to 1.
// z < 1 gives a small overshoot (z = 0.8 overshoots ~1.5%).
export function spring(t, t0, f = 2.2, z = 0.8) {
  const tau = t - t0;
  if (tau <= 0) return 0;
  const w = 2 * Math.PI * f;
  const wd = w * Math.sqrt(1 - z * z);
  return 1 - Math.exp(-z * w * tau) * (Math.cos(wd * tau) + ((z * w) / wd) * Math.sin(wd * tau));
}

// A value that changes target several times is a sum of springs,
// so it stays a pure function of time. ks = [[t, v], ...]; ks[0] is the start.
function keys(t, ks, f = 2.2, z = 0.85) {
  let v = ks[0][1];
  for (let i = 1; i < ks.length; i++) v += (ks[i][1] - ks[i - 1][1]) * spring(t, ks[i][0], f, z);
  return v;
}

const rnd = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};
function noise1(x) {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(rnd(i), rnd(i + 1), u) * 2 - 1;
}

// ---------------------------------------------------------------- drawing helpers
function rr(ctx, x, y, w, h, r) {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0, r), 0, Math.PI * 2);
}

// Point (cx, cy) of the world lands on screen center, scaled by s.
function camera(ctx, cx, cy, s) {
  ctx.translate(W / 2, H / 2);
  ctx.scale(s, s);
  ctx.translate(-cx, -cy);
}

function txt(ctx, s, x, y, { size = 24, weight = 500, fam = SANS, color = P.ink, align = 'left', alpha = 1, ls = 0 } = {}) {
  ctx.save();
  ctx.font = font(weight, size, fam);
  ctx.letterSpacing = `${ls}px`;
  ctx.textAlign = align;
  ctx.globalAlpha *= alpha;
  ctx.fillStyle = color;
  ctx.fillText(s, x, y);
  ctx.restore();
}

// Per-character layout so tracking can animate and centering stays stable.
function tracked(ctx, str, cx, y, { size, weight = 800, fam = SANS, color = P.ink, tracking = 0, visible = Infinity, align = 'center' }) {
  ctx.save();
  ctx.font = font(weight, size, fam);
  ctx.letterSpacing = '0px';
  const chars = [...str];
  const ws = chars.map((c) => ctx.measureText(c).width);
  const total = ws.reduce((a, b) => a + b, 0) + tracking * (chars.length - 1);
  let x = align === 'center' ? cx - total / 2 : cx;
  ctx.fillStyle = color;
  chars.forEach((c, i) => {
    if (i < visible) ctx.fillText(c, x, y);
    x += ws[i] + tracking;
  });
  ctx.restore();
  return total;
}

// A line of words, each rising through a mask on its own spring.
// parts: [[text, color], ...]. Returns layout so callers can attach things.
function words(ctx, t, s) {
  const size = s.size;
  ctx.save();
  ctx.font = font(s.weight ?? 700, size, s.fam ?? SANS);
  ctx.letterSpacing = `${s.ls ?? 0}px`;
  const toks = [];
  for (const [text, col] of s.parts) for (const w of text.split(/(?<= )/)) if (w) toks.push({ w, col });
  let total = 0;
  for (const tk of toks) {
    tk.width = ctx.measureText(tk.w).width;
    tk.x = total;
    total += tk.width;
  }
  const last = toks[toks.length - 1];
  total -= last.width - ctx.measureText(last.w.trimEnd()).width;
  const align = s.align ?? 'center';
  const x0 = align === 'center' ? s.x - total / 2 : align === 'right' ? s.x - total : s.x;
  const t0 = s.t0 ?? 0;
  const st = s.stagger ?? 0.055;
  const out = s.out ?? Infinity;
  ctx.beginPath();
  ctx.rect(x0 - size, s.y - size * 1.1, total + size * 2, size * 1.45);
  ctx.clip();
  toks.forEach((tk, i) => {
    const p = spring(t, t0 + i * st, s.f ?? 2.3, 0.82);
    if (p <= 0) return;
    const q = out === Infinity ? 0 : easeIn3(seg(t, out + i * st * 0.4, out + i * st * 0.4 + 0.26));
    if (q >= 1) return;
    const dy = (1 - p) * size * 1.15 - q * size * 1.15;
    ctx.globalAlpha = (s.alpha ?? 1) * clamp(p * 1.4) * (1 - q);
    ctx.fillStyle = tk.col;
    ctx.fillText(tk.w, x0 + tk.x, s.y + dy);
  });
  ctx.restore();
  return { x0, total, toks };
}

function cursor(ctx, x, y, { scale = 1, alpha = 1, press = 0 } = {}) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.translate(x, y);
  ctx.scale(scale * (1 - 0.14 * press), scale * (1 - 0.14 * press));
  ctx.beginPath();
  const pts = [[0, 0], [0, 34], [9, 26], [15.5, 40.5], [22, 37.5], [15.8, 23.5], [27.5, 23.5]];
  pts.forEach(([px, py], i) => (i ? ctx.lineTo(px, py) : ctx.moveTo(px, py)));
  ctx.closePath();
  ctx.shadowColor = 'rgba(0,0,0,0.45)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 4;
  ctx.fillStyle = '#FFFFFF';
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.lineWidth = 2.2;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#0A0A0A';
  ctx.stroke();
  ctx.restore();
}

function clickRing(ctx, t, tc, x, y, s = 1) {
  const k = seg(t, tc, tc + 0.35);
  if (k <= 0 || k >= 1) return;
  ctx.save();
  ctx.globalAlpha = (1 - k) * 0.9;
  ctx.strokeStyle = P.accent;
  ctx.lineWidth = 3 * s;
  circle(ctx, x, y, (8 + 34 * easeOut3(k)) * s);
  ctx.stroke();
  ctx.restore();
}

function lockIcon(ctx, x, y, s, color) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = color;
  rr(ctx, -10, -3, 20, 16, 4);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3.2;
  ctx.beginPath();
  ctx.arc(0, -3, 6.5, Math.PI, 0);
  ctx.stroke();
  ctx.restore();
}

// Partial polyline, k in [0,1] of total length.
function polyline(ctx, pts, k) {
  let len = 0;
  const segs = [];
  for (let i = 1; i < pts.length; i++) {
    const d = Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
    segs.push(d);
    len += d;
  }
  let left = len * clamp(k);
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length && left > 0; i++) {
    const d = segs[i - 1];
    const u = Math.min(1, left / d);
    ctx.lineTo(lerp(pts[i - 1][0], pts[i][0], u), lerp(pts[i - 1][1], pts[i][1], u));
    left -= d;
  }
}

function check(ctx, x, y, s, k, color, width = 6) {
  if (k <= 0) return;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  polyline(ctx, [[x - 15 * s, y + 1 * s], [x - 4 * s, y + 12 * s], [x + 17 * s, y - 12 * s]], easeOut3(k));
  ctx.stroke();
  ctx.restore();
}

function fmtInt(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// ---------------------------------------------------------------- background
function background(ctx, t, gridScale = 1) {
  ctx.fillStyle = P.bg;
  ctx.fillRect(0, 0, W, H);

  // soft accent glow that breathes with the big hits
  const hit = Math.max(
    Math.exp(-Math.max(0, t - 8.0) * 3) * (t >= 8 ? 1 : 0),
    Math.exp(-Math.max(0, t - 29.0) * 3) * (t >= 29 ? 1 : 0),
  );
  const gx = W / 2 + noise1(t * 0.15) * 260;
  const gy = H / 2 + noise1(t * 0.12 + 40) * 140;
  const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, 980);
  g.addColorStop(0, `rgba(198,255,74,${0.05 + 0.1 * hit})`);
  g.addColorStop(1, 'rgba(198,255,74,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // dot grid, drifting slowly, with a little parallax from the camera
  const sp = 48 * gridScale;
  const ox = (-t * 8 * gridScale) % sp;
  const oy = (-t * 4 * gridScale) % sp;
  ctx.fillStyle = 'rgba(255,255,255,0.055)';
  const d = Math.max(1.5, 2 * gridScale);
  for (let y = oy + (H / 2) % sp - sp; y < H + sp; y += sp)
    for (let x = ox + (W / 2) % sp - sp; x < W + sp; x += sp) ctx.fillRect(x, y, d, d);
}

function vignette(ctx) {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.5, W / 2, H / 2, H * 1.1);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.42)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// Huge outlined tickers scrolling in alternating directions.
function tickerWall(ctx, t, alpha, speed = 1) {
  if (alpha <= 0) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.font = font(700, 150, MONO);
  ctx.letterSpacing = '0px';
  ctx.fillStyle = P.ink;
  for (let r = 0; r < 5; r++) {
    const row = [...TICKERS.slice(r * 5), ...TICKERS.slice(0, r * 5)].join('  ') + '  ';
    const rw = ctx.measureText(row).width;
    const dir = r % 2 ? 1 : -1;
    let x = (((dir * t * 90 * speed + r * 377) % rw) + rw) % rw;
    x = -x;
    const y = 150 + r * 215;
    ctx.fillText(row, x, y);
    ctx.fillText(row, x + rw, y);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- scenes
// S1: "Every token needs a pair." The period is a lime dot; the camera dives into it.
const DOT_ZOOM = 14;
const HOOK_SIZE = 150;
function sceneHook(ctx, t) {
  const L1 = { parts: [['Every token', P.ink]], x: W / 2, y: 470, size: HOOK_SIZE, weight: 700, t0: 0.5, stagger: 0.08 };
  const L2 = { parts: [['needs a ', P.ink], ['pair', P.accent], ['.', 'rgba(0,0,0,0)']], x: W / 2, y: 650, size: HOOK_SIZE, weight: 700, t0: 1.0, stagger: 0.08 };

  // where the period sits on line 2
  ctx.save();
  ctx.font = font(700, HOOK_SIZE);
  const wA = ctx.measureText('needs a pair').width;
  const wDot = ctx.measureText('.').width;
  ctx.restore();
  const dotX = W / 2 - (wA + wDot) / 2 + wA + wDot / 2 + 4;
  const dotY = 650 - HOOK_SIZE * 0.085;
  const dotR = HOOK_SIZE * 0.085;

  const zk = seg(t, 1.55, 2.0);
  const s = DOT_ZOOM ** easeIn3(zk);
  const pan = easeInOut3(seg(t, 1.5, 1.85));
  const cx = lerp(W / 2, dotX, pan);
  const cy = lerp(H / 2, dotY, pan);

  ctx.save();
  camera(ctx, cx, cy, s);
  const fade = 1 - seg(t, 1.7, 1.95);
  ctx.globalAlpha = fade;
  words(ctx, t, L1);
  words(ctx, t, L2);
  ctx.globalAlpha = 1;

  const move = spring(t, 0.95, 2.1, 0.8);
  const x = lerp(W / 2, dotX, move);
  const y = lerp(H / 2, dotY, move);
  const r = dotR * spring(t, 0.05, 3.0, 0.6) * (1 + 0.35 * bump(t, 0.5, 0.25));
  ctx.fillStyle = P.accent;
  circle(ctx, x, y, r);
  ctx.fill();
  ctx.restore();
}

// S2 + S3: the token trades against ETH, then ETH gets dropped.
const PAIR_Y = 500, COIN_R = 118;
function sceneGasCoin(ctx, t) {
  const tokR0 = HOOK_SIZE * 0.085 * DOT_ZOOM;
  const tx = keys(t, [[2, W / 2], [2.0, 640], [5.0, W / 2]], 2.0, 0.85);
  const ty = keys(t, [[2, H / 2], [2.0, PAIR_Y], [5.0, H / 2]], 2.0, 0.85);
  let tr = keys(t, [[2, tokR0], [2.0, COIN_R], [5.0, 130]], 2.0, 0.85);
  tr *= 1 + 0.06 * bump(t, 5.5, 0.3);

  // ETH coin
  const eIn = spring(t, 2.25, 2.2, 0.75);
  const fall = Math.max(0, t - 4.5);
  const ex = lerp(1640, 1280, eIn) + fall * 140;
  const ey = PAIR_Y + 0.5 * 2600 * fall * fall;
  const eAlpha = clamp(eIn * 1.5) * (1 - seg(t, 4.85, 5.25));
  const erot = fall * 1.6;

  // link between them, snapping at 4.5
  const link = easeOut3(seg(t, 2.4, 2.7));
  if (link > 0 && t < 4.8) {
    const snap = easeOut3(seg(t, 4.5, 4.8));
    const a = tx + tr + 12;
    const b = ex - COIN_R - 12;
    const mid = (a + b) / 2;
    ctx.save();
    ctx.strokeStyle = t >= 4.5 ? P.red : 'rgba(242,243,238,0.35)';
    ctx.globalAlpha = 1 - snap;
    ctx.lineWidth = 3;
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -t * 40;
    ctx.beginPath();
    ctx.moveTo(a, PAIR_Y);
    ctx.lineTo(lerp(a, b, link) - (mid - a) * snap, PAIR_Y);
    if (snap > 0) {
      ctx.moveTo(mid + (b - mid) * snap, PAIR_Y + fall * fall * 900);
      ctx.lineTo(b, ey);
    }
    ctx.stroke();
    ctx.restore();
    txt(ctx, 'ORBIT / ETH', (a + b) / 2, PAIR_Y - 24, { size: 22, fam: MONO, color: P.muted, align: 'center', alpha: link * (1 - seg(t, 4.3, 4.5)), ls: 1 });
  }

  // volatile price chart
  const draw = easeInOut3(seg(t, 2.75, 3.9));
  const chartOut = seg(t, 4.5, 4.85);
  if (draw > 0 && chartOut < 1) {
    const x0 = 500, x1 = 1420, cy = 830;
    const pts = [];
    const xEnd = lerp(x0, x1, draw);
    for (let x = x0; x <= xEnd; x += 6) {
      const u = (x - x0) / (x1 - x0);
      let v = 0.55 * noise1(x * 0.016 + 3) + 0.3 * noise1(x * 0.055 + 10) + 0.15 * noise1(x * 0.18 + 20);
      v += 0.12 * noise1(x * 0.04 + t * 3) - 1.1 * u + 0.35;
      pts.push([x, cy - v * 62]);
    }
    ctx.save();
    ctx.globalAlpha = 1 - chartOut;
    ctx.strokeStyle = P.red;
    ctx.lineWidth = 3.5;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
    ctx.stroke();
    if (pts.length > 1) {
      const [hx, hy] = pts[pts.length - 1];
      ctx.fillStyle = P.red;
      circle(ctx, hx, hy, 7);
      ctx.fill();
      const pct = ((pts[pts.length - 1][1] - pts[0][1]) / 62) * -22;
      txt(ctx, `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%`, hx + 18, hy + 8, { size: 26, weight: 700, fam: MONO, color: P.red });
    }
    txt(ctx, 'ORBIT / ETH  1H', x0, 708, { size: 18, fam: MONO, color: P.muted, ls: 1 });
    ctx.restore();
  }

  // ETH coin body
  if (eAlpha > 0) {
    ctx.save();
    ctx.globalAlpha = eAlpha;
    ctx.translate(ex, ey);
    ctx.rotate(erot);
    ctx.fillStyle = P.panel3;
    circle(ctx, 0, 0, COIN_R);
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = 'rgba(255,255,255,0.14)';
    ctx.stroke();
    txt(ctx, 'ETH', 0, 12, { size: 38, weight: 700, fam: MONO, color: P.ink, align: 'center' });
    ctx.restore();
  }

  // token (lime) body
  ctx.save();
  if (t >= 5.75) {
    // grows into the lime wipe
    tr = lerp(tr, 1250, easeIn3(seg(t, 5.75, 6.0)));
  }
  ctx.fillStyle = P.accent;
  circle(ctx, tx, ty, tr);
  ctx.fill();
  const la = seg(t, 2.12, 2.35) * (1 - seg(t, 5.75, 5.85));
  if (la > 0) txt(ctx, '$ORBIT', tx, ty + 12, { size: 34 * (tr / COIN_R) ** 0.35, weight: 700, fam: MONO, color: P.accentInk, align: 'center', alpha: la });
  ctx.restore();

  // headlines
  words(ctx, t, { parts: [['Most tokens pair with a ', P.ink], ['gas coin.', P.red]], x: W / 2, y: 230, size: 80, weight: 600, t0: 2.35, stagger: 0.05, out: 3.82 });
  const hb = words(ctx, t, { parts: [['Stop launching against ', P.ink], ['ETH.', P.red]], x: W / 2, y: 250, size: 112, weight: 700, t0: 4.0, stagger: 0.07, out: 5.5 });
  const strike = easeOut3(seg(t, 4.45, 4.62)) * (1 - seg(t, 5.5, 5.68));
  if (strike > 0) {
    const eth = hb.toks[hb.toks.length - 1];
    const sx = hb.x0 + eth.x - 8;
    const ew = eth.width + 16;
    ctx.fillStyle = P.ink;
    ctx.fillRect(sx, 250 - 112 * 0.36, ew * strike, 10);
  }
}

// S4: "Start launching against the companies that actually print money."
function sceneCompanies(ctx, t) {
  const push = easeIn3(seg(t, 7.72, 8.0));
  ctx.save();
  camera(ctx, W / 2, H / 2, 1 + push * 0.9);
  ctx.globalAlpha = 1 - push;
  const sc = ctx.createRadialGradient(W / 2, 540, 100, W / 2, 540, 900);
  sc.addColorStop(0, 'rgba(7,8,10,0.85)');
  sc.addColorStop(1, 'rgba(7,8,10,0)');
  ctx.fillStyle = sc;
  ctx.fillRect(0, 0, W, H);
  words(ctx, t, { parts: [['Start launching against the companies', P.ink]], x: W / 2, y: 450, size: 96, weight: 700, t0: 6.05, stagger: 0.065 });
  words(ctx, t, { parts: [['that actually ', P.ink], ['print money.', P.accent]], x: W / 2, y: 574, size: 96, weight: 700, t0: 6.45, stagger: 0.08 });

  const picks = ['NVDA', 'TSLA', 'AAPL', 'SPY'];
  const pw = 190, gap = 24;
  const x0 = W / 2 - (picks.length * pw + (picks.length - 1) * gap) / 2;
  picks.forEach((tk, i) => {
    const p = spring(t, 7.0 + i * 0.125, 3.0, 0.65);
    if (p <= 0) return;
    const x = x0 + i * (pw + gap);
    ctx.save();
    ctx.translate(x + pw / 2, 700);
    ctx.scale(p, p);
    ctx.fillStyle = P.panel2;
    rr(ctx, -pw / 2, -38, pw, 76, 38);
    ctx.fill();
    ctx.strokeStyle = 'rgba(198,255,74,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();
    txt(ctx, tk, 0, 11, { size: 32, weight: 700, fam: MONO, color: P.ink, align: 'center' });
    ctx.restore();
  });
  ctx.restore();
}

// Lime wipe: a lime disc covers the frame (end of S3), then a dark disc
// opens from the center revealing S4.
function wipe(ctx, t) {
  const k = easeOut3(seg(t, 6.0, 6.32));
  if (t < 6.0 || k >= 1) return;
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.arc(W / 2, H / 2, k * 1200, 0, Math.PI * 2, true);
  ctx.fillStyle = P.accent;
  ctx.fill('evenodd');
  ctx.restore();
}

// S5: PAIR wordmark.
function wordmark(ctx, t, t0, y, size) {
  const k = seg(t, t0, t0 + 0.75);
  const tracking = lerp(size * 0.28, -size * 0.02, easeOutExpo(k));
  const sc = lerp(1.22, 1, spring(t, t0, 2.4, 0.72));
  const blur = 18 * (1 - seg(t, t0, t0 + 0.16));
  ctx.save();
  ctx.translate(W / 2, y);
  ctx.scale(sc, sc);
  if (blur > 0.4) ctx.filter = `blur(${blur.toFixed(1)}px)`;
  ctx.globalAlpha *= clamp((t - t0) / 0.06);
  tracked(ctx, 'PAIR', 0, 0, { size, weight: 800, color: P.ink, tracking });
  ctx.restore();
}

function sceneBrand(ctx, t) {
  const out = easeIn3(seg(t, 9.55, 9.88));
  ctx.save();
  ctx.translate(0, -140 * out);
  ctx.globalAlpha = 1 - out;
  wordmark(ctx, t, 8.0, 545, 280);
  words(ctx, t, { parts: [['Launch tokens paired with ', P.ink], ['tokenized stocks.', P.accent]], x: W / 2, y: 660, size: 48, weight: 500, t0: 8.55, stagger: 0.05 });
  const label = 'THE FIRST MULTIPOOL LAUNCHPAD ON ROBINHOOD CHAIN';
  const vis = Math.floor(seg(t, 9.0, 9.45) * label.length);
  if (vis > 0) tracked(ctx, label, W / 2, 752, { size: 22, weight: 500, fam: MONO, color: P.muted, tracking: 5, visible: vis });
  ctx.restore();
}

// ---------------------------------------------------------------- launch panel (S6)
const PX = 380, PY = 170, PW = 1160, PH = 740;
const FIELD_Y = 296, FIELD_H = 90;
const GRID_X = 428, GRID_Y = 486, CHIP_W = 122, CHIP_H = 62, CHIP_GAP = 12;
const BTN = { x: 1192, y: 790, w: 300, h: 84, r: 20 };
const chipPos = (i) => ({ x: GRID_X + (i % 8) * (CHIP_W + CHIP_GAP), y: GRID_Y + Math.floor(i / 8) * (CHIP_H + CHIP_GAP) });
const chipCenter = (tk) => {
  const p = chipPos(TICKERS.indexOf(tk));
  return [p.x + CHIP_W / 2, p.y + CHIP_H / 2];
};

const CURSOR_MOVES = [
  [9.9, 1760, 1060],
  [10.0, 700, 346],
  [10.55, 1230, 346],
  [11.22, ...chipCenter('NVDA')],
  [11.72, ...chipCenter('TSLA')],
  [12.22, ...chipCenter('AAPL')],
  [12.72, ...chipCenter('SPY')],
  [13.3, BTN.x + BTN.w / 2 + 20, BTN.y + BTN.h / 2 + 6],
  [14.15, 1640, 1020],
];
const CLICKS = [10.15, 10.8, ...PICKS.map((p) => p.t), LAUNCH_T];

function cameraLaunch(t) {
  return {
    x: W / 2,
    y: keys(t, [[10, H / 2], [10.1, 342], [11.12, 562], [13.2, 800], [14.02, H / 2]], 1.6, 0.92),
    s: keys(t, [[10, 1], [10.1, 1.5], [11.12, 1.5], [13.2, 1.48], [14.02, 1]], 1.6, 0.92),
  };
}

function field(ctx, t, x, y, w, label, value, focused, caretOn) {
  ctx.fillStyle = P.panel2;
  rr(ctx, x, y, w, FIELD_H, 16);
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = focused > 0 ? `rgba(198,255,74,${0.25 + 0.6 * focused})` : P.line;
  ctx.stroke();
  txt(ctx, label, x + 24, y + 30, { size: 14, weight: 500, fam: MONO, color: P.muted, ls: 2 });
  txt(ctx, value, x + 24, y + 72, { size: 30, weight: 600, color: P.ink });
  if (caretOn) {
    ctx.save();
    ctx.font = font(600, 30);
    const cw = ctx.measureText(value).width;
    ctx.restore();
    ctx.fillStyle = P.accent;
    ctx.fillRect(x + 26 + cw, y + 46, 3, 34);
  }
}

function selectedAt(t) {
  return PICKS.filter((p) => t >= p.t);
}

function scenePanel(ctx, t) {
  const cam = cameraLaunch(t);
  const enter = spring(t, 9.72, 1.7, 0.9);
  const fadeOut = seg(t, 14.03, 14.26);
  ctx.save();
  camera(ctx, cam.x, cam.y, cam.s);
  ctx.translate(0, (1 - enter) * 760);

  // panel chrome and contents fade together; the Launch button survives
  ctx.save();
  ctx.globalAlpha = 1 - fadeOut;
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 60;
  ctx.shadowOffsetY = 20;
  ctx.fillStyle = P.panel;
  rr(ctx, PX, PY, PW, PH, 28);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 2;
  ctx.stroke();

  txt(ctx, 'Launch a token', PX + 48, PY + 70, { size: 34, weight: 600 });
  ctx.fillStyle = P.accent;
  circle(ctx, PX + PW - 48 - 224, PY + 58, 5);
  ctx.fill();
  txt(ctx, 'ROBINHOOD CHAIN', PX + PW - 48, PY + 64, { size: 16, fam: MONO, color: P.muted, align: 'right', ls: 2 });

  const nName = clamp(Math.floor((t - NAME_T0) / NAME_STEP) + 1, 0, NAME.length);
  const nTick = clamp(Math.floor((t - TICK_T0) / TICK_STEP) + 1, 0, TICK.length);
  const blink = Math.floor(t * 4) % 2 === 0;
  const fName = seg(t, 10.12, 10.2) * (1 - seg(t, 10.78, 10.86));
  const fTick = seg(t, 10.78, 10.86) * (1 - seg(t, 11.4, 11.5));
  field(ctx, t, PX + 48, FIELD_Y, 520, 'NAME', NAME.slice(0, nName), fName, fName > 0.5 && (blink || nName < NAME.length));
  field(ctx, t, PX + 592, FIELD_Y, 520, 'TICKER', TICK.slice(0, nTick), fTick, fTick > 0.5 && (blink || nTick < TICK.length));

  const sel = selectedAt(t);
  txt(ctx, 'Pair with stock tokens', PX + 48, GRID_Y - 28, { size: 24, weight: 600 });
  const cnt = sel.length;
  ctx.save();
  ctx.font = font(500, 18, MONO);
  ctx.letterSpacing = '1px';
  const tail = ' / 5 SELECTED';
  const tw = ctx.measureText(tail).width;
  ctx.textAlign = 'right';
  ctx.fillStyle = P.muted;
  ctx.fillText(tail, PX + PW - 48, GRID_Y - 30);
  ctx.fillStyle = cnt ? P.accent : P.muted;
  const lastPick = sel.length ? sel[sel.length - 1].t : 0;
  const pop = 1 + 0.35 * bump(t, lastPick, 0.2);
  ctx.translate(PX + PW - 48 - tw, GRID_Y - 30);
  ctx.scale(pop, pop);
  ctx.fillText(String(cnt), 0, 0);
  ctx.restore();

  TICKERS.forEach((tk, i) => {
    const { x, y } = chipPos(i);
    const pick = PICKS.find((p) => p.tk === tk);
    const on = pick ? spring(t, pick.t, 3.0, 0.7) : 0;
    const press = pick ? bump(t, pick.t - 0.04, 0.16) : 0;
    const hover = pick ? seg(t, pick.t - 0.3, pick.t - 0.15) * (1 - seg(t, pick.t + 0.3, pick.t + 0.45)) : 0;
    ctx.save();
    ctx.translate(x + CHIP_W / 2, y + CHIP_H / 2);
    const sc = 1 - 0.08 * press;
    ctx.scale(sc, sc);
    ctx.fillStyle = hover > 0 ? P.panel3 : P.panel2;
    rr(ctx, -CHIP_W / 2, -CHIP_H / 2, CHIP_W, CHIP_H, 14);
    ctx.fill();
    if (on > 0.01) {
      ctx.globalAlpha = (1 - fadeOut) * clamp(on);
      ctx.fillStyle = P.accent;
      ctx.fill();
      ctx.globalAlpha = 1 - fadeOut;
    }
    if (on <= 0.01) {
      ctx.strokeStyle = P.line;
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
    txt(ctx, tk, 0, 8, { size: 21, weight: on > 0.5 ? 700 : 500, fam: MONO, color: on > 0.5 ? P.accentInk : P.muted, align: 'center' });
    ctx.restore();
  });

  // basket preview: one pill per pool that the launch will create
  txt(ctx, 'POOLS', PX + 48, BTN.y - 6, { size: 14, fam: MONO, color: P.muted, ls: 2 });
  let bx = PX + 48;
  sel.forEach((p) => {
    const k = spring(t, p.t + 0.05, 2.6, 0.75);
    const label = `ORBIT / ${p.tk}`;
    ctx.save();
    ctx.font = font(500, 18, MONO);
    const w = ctx.measureText(label).width + 36;
    ctx.restore();
    ctx.save();
    ctx.globalAlpha *= clamp(k * 1.5);
    ctx.translate(bx, BTN.y + 14 + (1 - k) * 20);
    ctx.fillStyle = P.panel2;
    rr(ctx, 0, 0, w, 46, 23);
    ctx.fill();
    ctx.strokeStyle = 'rgba(198,255,74,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    txt(ctx, label, 18, 30, { size: 18, fam: MONO, color: P.ink });
    ctx.restore();
    bx += w + 12;
  });
  txt(ctx, `${cnt} locked Uniswap v4 pool${cnt === 1 ? '' : 's'}  ·  1% swap fee`, PX + 48, BTN.y + 104, { size: 16, fam: MONO, color: P.muted, ls: 1 });
  ctx.restore();

  // cursor
  const cx = keys(t, CURSOR_MOVES.map(([tt, x]) => [tt, x]), 2.1, 0.9);
  const cy = keys(t, CURSOR_MOVES.map(([tt, , y]) => [tt, y]), 2.1, 0.9);
  CLICKS.forEach((tc) => clickRing(ctx, t, tc, cx, cy, 1 / cam.s));
  const press = Math.max(...CLICKS.map((tc) => bump(t, tc - 0.05, 0.14)));
  const ca = seg(t, 9.9, 10.05) * (1 - seg(t, 14.15, 14.4));
  cursor(ctx, cx, cy, { scale: 1 / cam.s, alpha: ca, press });
  ctx.restore();

  // The Launch button morphs into the token disc. It is drawn in screen space
  // so the morph lands on the cluster center whatever the camera is doing.
  launchButton(ctx, t, cam, (1 - enter) * 760);
}

function launchButton(ctx, t, cam, offY) {
  if (t >= 14.75) return; // handed over to sceneCluster
  const m = spring(t, 14.08, 2.0, 0.86);
  const bx = (BTN.x + BTN.w / 2 - cam.x) * cam.s + W / 2;
  const by = (BTN.y + BTN.h / 2 + offY - cam.y) * cam.s + H / 2;
  const x = lerp(bx, W / 2, m);
  const y = lerp(by, 560, m);
  const k = lerp(cam.s, 1, m);
  const w = lerp(BTN.w, 96 * CL_S, m);
  const h = lerp(BTN.h, 96 * CL_S, m);
  const r = lerp(BTN.r, 48 * CL_S, m);
  const hover = seg(t, 13.5, 13.62);
  const press = bump(t, LAUNCH_T - 0.05, 0.16);
  ctx.save();
  ctx.translate(x, y);
  const sc = k * (1 - 0.06 * press);
  ctx.scale(sc, sc);
  if (hover > 0 && m < 0.5) {
    ctx.shadowColor = 'rgba(198,255,74,0.45)';
    ctx.shadowBlur = 40 * hover;
  }
  ctx.fillStyle = P.accent;
  rr(ctx, -w / 2, -h / 2, w, h, r);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  const la = 1 - seg(t, 14.02, 14.12);
  if (la > 0) txt(ctx, 'Launch', 0, 10, { size: 28, weight: 600, color: P.accentInk, align: 'center', alpha: la });
  // spinner, then check, then the ticker
  const sp = seg(t, 14.2, 14.28) * (1 - seg(t, 14.55, 14.62));
  if (sp > 0) {
    ctx.save();
    ctx.globalAlpha *= sp;
    ctx.strokeStyle = P.accentInk;
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    const a0 = t * 11;
    ctx.beginPath();
    ctx.arc(0, 0, 24, a0, a0 + Math.PI * 1.3);
    ctx.stroke();
    ctx.restore();
  }
  const ck = seg(t, 14.6, 14.78);
  if (ck > 0) check(ctx, 0, 0, 1.1 * CL_S, ck, P.accentInk, 7);
  ctx.restore();
}

// ---------------------------------------------------------------- pool cluster (S7 to S9)
const NODES = [
  { tk: 'NVDA', dx: -360, dy: -210 },
  { tk: 'TSLA', dx: 360, dy: -210 },
  { tk: 'AAPL', dx: -360, dy: 210 },
  { tk: 'SPY', dx: 360, dy: 210 },
];

const CL_S = 1.2;
function clusterXform(t) {
  return {
    x: keys(t, [[14, W / 2], [16.0, 570], [18.0, W / 2]], 1.7, 0.9),
    y: keys(t, [[14, 560], [16.0, 560], [18.0, 500]], 1.7, 0.9),
    s: keys(t, [[14, CL_S], [16.0, 0.86], [18.0, 0.7], [19.9, 0.4]], 1.7, 0.9),
    a: 1 - seg(t, 19.88, 20.1),
  };
}

function sceneCluster(ctx, t) {
  const X = clusterXform(t);
  if (X.a <= 0) return;
  ctx.save();
  ctx.globalAlpha = X.a;
  ctx.translate(X.x, X.y);
  ctx.scale(X.s, X.s);
  const tokR = 84;
  NODES.forEach((n, i) => {
    const te = 14.8 + i * 0.12;
    const k = spring(t, te, 2.3, 0.72);
    if (k <= 0) return;
    const nx = n.dx * k, ny = n.dy * k;
    const len = Math.hypot(nx, ny);
    const ux = nx / (len || 1), uy = ny / (len || 1);
    // pool line
    ctx.save();
    ctx.strokeStyle = 'rgba(242,243,238,0.28)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(ux * (tokR + 10), uy * (tokR + 10));
    ctx.lineTo(nx - ux * 72, ny - uy * 72);
    ctx.stroke();
    ctx.restore();
    // trades flowing through the pool
    const flow = seg(t, 15.6, 15.9);
    if (flow > 0 && len > 200) {
      for (let j = 0; j < 3; j++) {
        const u = (((t * 0.55 + j / 3 + i * 0.17) % 1) + 1) % 1;
        const dir = (i + j) % 2 ? u : 1 - u;
        const px = lerp(ux * (tokR + 14), nx - ux * 76, dir);
        const py = lerp(uy * (tokR + 14), ny - uy * 76, dir);
        ctx.fillStyle = P.accent;
        ctx.globalAlpha = X.a * flow * Math.sin(Math.PI * u) * 0.9;
        circle(ctx, px, py, 5);
        ctx.fill();
      }
      ctx.globalAlpha = X.a;
    }
    // lock
    const lk = spring(t, 15.5 + i * 0.06, 3.2, 0.6);
    if (lk > 0) {
      const mx = (ux * (tokR + 10) + nx - ux * 72) / 2;
      const my = (uy * (tokR + 10) + ny - uy * 72) / 2;
      ctx.save();
      ctx.translate(mx, my);
      ctx.scale(lk, lk);
      ctx.fillStyle = P.bg;
      circle(ctx, 0, 0, 26);
      ctx.fill();
      ctx.strokeStyle = 'rgba(198,255,74,0.6)';
      ctx.lineWidth = 2;
      ctx.stroke();
      lockIcon(ctx, 0, 1, 1, P.accent);
      ctx.restore();
    }
    // stock node
    ctx.save();
    ctx.translate(nx, ny);
    ctx.fillStyle = P.panel2;
    circle(ctx, 0, 0, 68);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    txt(ctx, n.tk, 0, 9, { size: 26, weight: 700, fam: MONO, color: P.ink, align: 'center' });
    ctx.restore();
  });
  ctx.restore();

  // The token disc itself is the Launch button (drawn by launchButton) until
  // the panel scene ends; after that we draw it here in the cluster frame.
  if (t >= 14.75) {
    ctx.save();
    ctx.globalAlpha = X.a;
    ctx.translate(X.x, X.y);
    ctx.scale(X.s, X.s);
    const grow = spring(t, 14.75, 2.4, 0.75);
    const r = lerp(48, tokR, grow);
    ctx.fillStyle = P.accent;
    circle(ctx, 0, 0, r);
    ctx.fill();
    const lab = seg(t, 14.82, 14.98);
    if (lab > 0) txt(ctx, '$ORBIT', 0, 11, { size: 32, weight: 700, fam: MONO, color: P.accentInk, align: 'center', alpha: lab });
    const ck = seg(t, 14.6, 14.78) * (1 - seg(t, 14.8, 14.9));
    if (ck > 0) check(ctx, 0, 0, 1.1, seg(t, 14.6, 14.78), P.accentInk, 7);
    ctx.restore();
  }
}

function sceneLaunchCopy(ctx, t) {
  words(ctx, t, { parts: [['One transaction. ', P.ink], ['Four pools.', P.accent]], x: W / 2, y: 160, size: 80, weight: 700, t0: 14.72, stagger: 0.06, out: 15.86 });
  words(ctx, t, { parts: [['Liquidity locked in Uniswap v4. ', P.muted], ['Forever.', P.ink]], x: W / 2, y: 1000, size: 38, weight: 500, t0: 15.5, stagger: 0.04, out: 15.9 });
}

// S8
function sceneNoCurve(ctx, t) {
  const L = [
    { parts: [['No ', P.muted], ['bonding curve.', P.ink]], y: 430, t0: 16.0, out: 17.8 },
    { parts: [['No ', P.muted], ['price ceiling.', P.ink]], y: 570, t0: 16.5, out: 17.84 },
    { parts: [['No ', P.muted], ['migration.', P.ink]], y: 710, t0: 17.0, out: 17.88 },
  ];
  L.forEach((l) => {
    words(ctx, t, { ...l, x: 1060, align: 'left', size: 84, weight: 700, stagger: 0.06 });
    const k = spring(t, l.t0, 3, 0.7) * (1 - seg(t, l.out, l.out + 0.2));
    if (k > 0) {
      ctx.fillStyle = P.accent;
      ctx.fillRect(1020, l.y - 42, 12 * k, 12 * k);
    }
  });
}

// S9: the pool stays put while time runs underneath it.
const STOPS = ['SECOND 1', 'MINUTE 1', 'DAY 1', 'MONTH 1', 'YEAR 1', 'YEAR 5'];
function sceneTimeline(ctx, t) {
  const inK = seg(t, 18.0, 18.2) * (1 - seg(t, 19.85, 20.05));
  if (inK <= 0) return;
  words(ctx, t, { parts: [['The pool at second one', P.ink]], x: W / 2, y: 160, size: 64, weight: 700, t0: 18.02, stagger: 0.05, out: 19.8 });
  words(ctx, t, { parts: [['is the pool at ', P.ink], ['year five.', P.accent]], x: W / 2, y: 240, size: 64, weight: 700, t0: 18.2, stagger: 0.05, out: 19.82 });
  const SP = 400;
  const off = TIMELINE_STEPS.reduce((a, ts) => a + SP * spring(t, ts, 2.8, 0.85), 0);
  const y = 850;
  ctx.save();
  ctx.globalAlpha = inK;
  // axis with minor ticks
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(140, y);
  ctx.lineTo(W - 140, y);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  for (let i = -10; i < 60; i++) {
    const x = W / 2 + i * 80 - (off % 80);
    if (x < 140 || x > W - 140) continue;
    ctx.fillRect(x - 1, y - 6, 2, 12);
  }
  STOPS.forEach((s, i) => {
    const x = W / 2 + i * SP - off;
    const d = Math.abs(x - W / 2);
    const a = clamp(1 - d / 900);
    if (a <= 0) return;
    const near = clamp(1 - d / 120);
    ctx.fillStyle = near > 0.5 ? P.accent : 'rgba(255,255,255,0.45)';
    circle(ctx, x, y, 5 + 3 * near);
    ctx.fill();
    txt(ctx, s, x, y + 62, { size: 30, weight: near > 0.5 ? 700 : 500, fam: MONO, color: near > 0.5 ? P.ink : P.muted, align: 'center', alpha: a, ls: 2 });
  });
  // marker from the pool to the axis
  const X = clusterXform(t);
  const top = X.y + 300 * X.s;
  ctx.strokeStyle = P.accent;
  ctx.setLineDash([6, 8]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, top);
  ctx.lineTo(W / 2, y - 16);
  ctx.stroke();
  ctx.setLineDash([]);
  txt(ctx, 'SAME POOL  ·  NEVER MIGRATES', W / 2 + 22, (top + y) / 2 + 7, { size: 18, fam: MONO, color: P.muted, ls: 2 });
  ctx.restore();
}

// S10: fees
function sceneFees(ctx, t) {
  const out = easeIn3(seg(t, 21.85, 22.1));
  if (t < 19.95 || out >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - out;
  words(ctx, t, { parts: [['1% ', P.accent], ['swap fee on every trade.', P.ink]], x: W / 2, y: 390, size: 86, weight: 700, t0: 20.0, stagger: 0.055 });
  const bx = 360, by = 500, bw = 1200, bh = 132;
  const k0 = seg(t, 20.3, 20.45);
  ctx.globalAlpha = (1 - out) * k0;
  ctx.fillStyle = P.panel2;
  rr(ctx, bx, by, bw, bh, 24);
  ctx.fill();
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.globalAlpha = 1 - out;
  const wa = 0.7 * bw * spring(t, 20.5, 1.7, 0.9);
  const wb = 0.3 * bw * spring(t, 20.75, 1.7, 0.9);
  const gap = 8;
  // creator share
  if (wa > 1) {
    ctx.save();
    rr(ctx, bx, by, Math.max(0, wa - gap / 2), bh, 24);
    ctx.fillStyle = P.accent;
    ctx.fill();
    ctx.clip();
    const pct = Math.round(70 * clamp(wa / (0.7 * bw)));
    txt(ctx, `${pct}%`, bx + 36, by + 76, { size: 64, weight: 700, fam: MONO, color: P.accentInk });
    txt(ctx, 'to the token creator', bx + 36, by + 114, { size: 26, weight: 600, color: P.accentInk });
    ctx.restore();
  }
  if (wb > 1) {
    ctx.save();
    const x = bx + 0.7 * bw + gap / 2;
    rr(ctx, x, by, Math.max(0, wb - gap / 2), bh, 24);
    ctx.fillStyle = P.panel3;
    ctx.fill();
    ctx.clip();
    const pct = Math.round(30 * clamp(wb / (0.3 * bw)));
    txt(ctx, `${pct}%`, x + 32, by + 76, { size: 64, weight: 700, fam: MONO, color: P.ink });
    txt(ctx, 'protocol treasury', x + 32, by + 114, { size: 26, weight: 500, color: P.muted });
    ctx.restore();
  }
  words(ctx, t, { parts: [['Collected permissionlessly. ', P.muted], ['Claimable per asset.', P.ink]], x: W / 2, y: 740, size: 36, weight: 500, t0: 21.0, stagger: 0.04 });
  ctx.restore();
}

// S11: non-custodial
function sceneCustody(ctx, t) {
  const out = easeIn3(seg(t, 23.85, 24.1));
  if (t < 21.95 || out >= 1) return;
  ctx.save();
  ctx.globalAlpha = 1 - out;
  words(ctx, t, { parts: [['Non-custodial. ', P.ink], ['By design.', P.accent]], x: W / 2, y: 250, size: 96, weight: 700, t0: 22.0, stagger: 0.07 });
  const k = spring(t, 22.08, 1.9, 0.85);
  const cw = 840, ch = 330;
  const cx = W / 2 - cw / 2, cy = 350 + (1 - k) * 80;
  ctx.globalAlpha = (1 - out) * clamp(k * 1.3);
  const signed = seg(t, SIGN_T + 0.05, SIGN_T + 0.2);
  ctx.shadowColor = 'rgba(0,0,0,0.55)';
  ctx.shadowBlur = 50;
  ctx.shadowOffsetY = 18;
  ctx.fillStyle = P.panel;
  rr(ctx, cx, cy, cw, ch, 26);
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = signed > 0 ? `rgba(198,255,74,${0.2 + 0.5 * signed})` : 'rgba(255,255,255,0.1)';
  ctx.lineWidth = 2;
  ctx.stroke();
  txt(ctx, 'Signature request', cx + 44, cy + 70, { size: 32, weight: 600 });
  txt(ctx, 'YOUR WALLET', cx + cw - 44, cy + 66, { size: 17, fam: MONO, color: P.muted, align: 'right', ls: 2 });
  txt(ctx, 'Launch $ORBIT  ·  4 pools  ·  Robinhood Chain', cx + 44, cy + 128, { size: 23, fam: MONO, color: P.muted });
  // buttons
  const by = cy + 200, bh = 84, bw = (cw - 88 - 20) / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  rr(ctx, cx + 44, by, bw, bh, 18);
  ctx.stroke();
  txt(ctx, 'Reject', cx + 44 + bw / 2, by + 52, { size: 30, weight: 500, color: P.muted, align: 'center' });
  const sx = cx + 44 + bw + 20;
  const press = bump(t, SIGN_T - 0.05, 0.16);
  ctx.save();
  ctx.translate(sx + bw / 2, by + bh / 2);
  ctx.scale(1 - 0.05 * press, 1 - 0.05 * press);
  ctx.fillStyle = P.accent;
  rr(ctx, -bw / 2, -bh / 2, bw, bh, 18);
  ctx.fill();
  txt(ctx, 'Sign', 0, 11, { size: 30, weight: 600, color: P.accentInk, align: 'center', alpha: 1 - signed });
  if (signed > 0) {
    check(ctx, -66, 0, 0.95, seg(t, SIGN_T + 0.05, SIGN_T + 0.25), P.accentInk, 6);
    txt(ctx, 'Signed', 14, 11, { size: 30, weight: 600, color: P.accentInk, align: 'center', alpha: signed });
  }
  ctx.restore();
  ctx.globalAlpha = 1 - out;
  // cursor
  const cxp = keys(t, [[22, 1500], [22.2, sx + bw / 2 + 24], [23.1, 1480]], 2.1, 0.9);
  const cyp = keys(t, [[22, 1000], [22.2, by + bh / 2 + 8], [23.1, 960]], 2.1, 0.9);
  clickRing(ctx, t, SIGN_T, cxp, cyp);
  cursor(ctx, cxp, cyp, { alpha: seg(t, 22.1, 22.25) * (1 - seg(t, 23.2, 23.4)), press });
  words(ctx, t, { parts: [['Your wallet signs everything. ', P.ink], ['PAIR never holds funds.', P.muted]], x: W / 2, y: 820, size: 42, weight: 500, t0: 23.0, stagger: 0.04 });
  ctx.restore();
}

// S12: traction
const STATS = [
  { v: 26, f: (v) => `$${Math.round(v)}M+`, label: 'all-time trading volume', x: 600, y: 420 },
  { v: 160, f: (v) => `${Math.round(v)}K+`, label: 'trades processed', x: 1320, y: 420 },
  { v: 180, f: (v) => `$${Math.round(v)}K+`, label: 'paid out to creators', x: 600, y: 710 },
  { v: 1200, f: (v) => `${fmtInt(v)}+`, label: 'tokens earning creator rewards', x: 1320, y: 710 },
];
function sceneStats(ctx, t) {
  const out = easeIn3(seg(t, 27.72, 28.02));
  if (t < 23.95 || out >= 1) return;
  ctx.save();
  camera(ctx, W / 2, H / 2, 1 - 0.06 * out);
  ctx.globalAlpha = 1 - out;
  const label = 'FIVE DAYS AFTER MULTIPOOL WENT LIVE';
  const vis = Math.floor(seg(t, 24.05, 24.4) * label.length);
  if (vis > 0) tracked(ctx, label, W / 2, 190, { size: 24, weight: 500, fam: MONO, color: P.accent, tracking: 5, visible: vis });
  // dividers
  const dv = easeInOut3(seg(t, 24.2, 24.9));
  ctx.strokeStyle = P.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(W / 2, 565 - 260 * dv);
  ctx.lineTo(W / 2, 565 + 260 * dv);
  ctx.moveTo(W / 2 - 700 * dv, 565);
  ctx.lineTo(W / 2 + 700 * dv, 565);
  ctx.stroke();
  STATS.forEach((s, i) => {
    const ts = STATS_T[i];
    const k = easeOutExpo(seg(t, ts, ts + 0.9));
    const value = s.f(s.v * k);
    words(ctx, t, { parts: [[value, P.ink]], x: s.x, y: s.y, size: 132, weight: 700, t0: ts, stagger: 0 });
    words(ctx, t, { parts: [[s.label, P.muted]], x: s.x, y: s.y + 64, size: 28, weight: 500, t0: ts + 0.12, stagger: 0.03 });
  });
  const pk = spring(t, 26.75, 2.5, 0.75);
  if (pk > 0) {
    const text = 'PARTNERED WITH AWS TO SCALE';
    ctx.save();
    ctx.font = font(500, 18, MONO);
    ctx.letterSpacing = '3px';
    const w = ctx.measureText(text).width + 56;
    ctx.restore();
    ctx.save();
    ctx.translate(W / 2, 900);
    ctx.scale(pk, pk);
    ctx.fillStyle = P.panel2;
    rr(ctx, -w / 2, -28, w, 56, 28);
    ctx.fill();
    ctx.strokeStyle = 'rgba(198,255,74,0.45)';
    ctx.lineWidth = 2;
    ctx.stroke();
    txt(ctx, text, 0, 7, { size: 18, fam: MONO, color: P.ink, align: 'center', ls: 3 });
    ctx.restore();
  }
  txt(ctx, 'Source: PAIR press release, Aug 31 2026. Multipool went live Aug 26.', W / 2, 1020, { size: 18, fam: MONO, color: P.dim, align: 'center', alpha: seg(t, 27.0, 27.2) });
  ctx.restore();
}

// S13: end card
function sceneEnd(ctx, t) {
  if (t < 27.95) return;
  // ring of every launchable stock token, collapsing into the wordmark
  const collapse = easeIn3(seg(t, 28.55, 29.0));
  if (collapse < 1) {
    TICKERS.forEach((tk, i) => {
      const k = spring(t, 28.0 + i * 0.018, 2.4, 0.8);
      if (k <= 0) return;
      const R = lerp(760, 430, k) * (1 - collapse);
      const a = (i / TICKERS.length) * Math.PI * 2 + t * 0.5 + collapse * 1.2;
      const x = W / 2 + Math.cos(a) * R * 1.5;
      const y = H / 2 + Math.sin(a) * R * 0.92;
      ctx.save();
      ctx.globalAlpha = clamp(k * 1.5) * (1 - collapse);
      ctx.translate(x, y);
      const sc = 1 - 0.6 * collapse;
      ctx.scale(sc, sc);
      ctx.fillStyle = P.panel2;
      rr(ctx, -60, -24, 120, 48, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      txt(ctx, tk, 0, 7, { size: 20, weight: 600, fam: MONO, color: P.ink, align: 'center' });
      ctx.restore();
    });
  }
  if (t >= 29.0) {
    const ex = easeOutExpo(seg(t, 29.0, 30.0));
    TICKERS.forEach((tk, i) => {
      const R = 500 * ex;
      const a = (i / TICKERS.length) * Math.PI * 2 + t * 0.12 + 1.7;
      const x = W / 2 + Math.cos(a) * R * 1.62;
      const y = H / 2 + Math.sin(a) * R * 0.9;
      ctx.save();
      ctx.globalAlpha = 0.32 * ex;
      ctx.translate(x, y);
      ctx.fillStyle = P.panel2;
      rr(ctx, -60, -24, 120, 48, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.14)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      txt(ctx, tk, 0, 7, { size: 20, weight: 600, fam: MONO, color: P.ink, align: 'center' });
      ctx.restore();
    });
    const sk = seg(t, 29.0, 29.7);
    if (sk < 1) {
      ctx.save();
      ctx.globalAlpha = (1 - sk) * 0.55;
      ctx.strokeStyle = P.accent;
      ctx.lineWidth = 3;
      circle(ctx, W / 2, H / 2 - 40, 60 + 1000 * easeOut3(sk));
      ctx.stroke();
      ctx.restore();
    }
    wordmark(ctx, t, 29.0, 520, 250);
    words(ctx, t, { parts: [['Pair your token with ', P.ink], ['the market.', P.accent]], x: W / 2, y: 640, size: 56, weight: 600, t0: 29.5, stagger: 0.06 });
    const pk = spring(t, 30.0, 2.6, 0.7);
    if (pk > 0) {
      ctx.save();
      ctx.translate(W / 2, 760);
      ctx.scale(pk, pk);
      ctx.fillStyle = P.accent;
      rr(ctx, -150, -38, 300, 76, 38);
      ctx.fill();
      txt(ctx, 'pair.fund', 0, 11, { size: 32, weight: 700, fam: MONO, color: P.accentInk, align: 'center' });
      ctx.restore();
    }
    const label = 'LIVE ON ROBINHOOD CHAIN';
    const vis = Math.floor(seg(t, 30.3, 30.6) * label.length);
    if (vis > 0) tracked(ctx, label, W / 2, 870, { size: 20, weight: 500, fam: MONO, color: P.muted, tracking: 5, visible: vis });
  }
}

// ---------------------------------------------------------------- frame
export function draw(ctx, t) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalAlpha = 1;
  ctx.filter = 'none';
  ctx.textBaseline = 'alphabetic';
  ctx.letterSpacing = '0px';

  let gridScale = 1;
  if (t < 2) gridScale = 1 + 0.4 * easeIn3(seg(t, 1.55, 2.0));
  background(ctx, t, gridScale);

  // ticker wall behind S4 and S5
  const wallA = t < 6 || t > 10.1 ? 0 : t < 8 ? 0.045 * (1 + 1.2 * easeIn3(seg(t, 7.5, 8.0))) : 0.03 * (1 - seg(t, 9.5, 9.9));
  if (wallA > 0) {
    ctx.save();
    const zs = t < 8 ? 1 + 0.25 * easeIn3(seg(t, 7.6, 8.0)) : 1;
    camera(ctx, W / 2, H / 2, zs);
    tickerWall(ctx, t, wallA, t < 8 ? 1 + 3 * easeIn3(seg(t, 7.5, 8.0)) : 0.5);
    ctx.restore();
  }

  if (t < 2) sceneHook(ctx, t);
  else if (t < 6) sceneGasCoin(ctx, t);
  if (t >= 6 && t < 8) sceneCompanies(ctx, t);
  if (t >= 8 && t < 10.1) sceneBrand(ctx, t);
  if (t >= 9.7 && t < 14.75) scenePanel(ctx, t);
  if (t >= 14.75 && t < 20.1) sceneCluster(ctx, t);
  if (t >= 14.6 && t < 16.2) sceneLaunchCopy(ctx, t);
  if (t >= 16 && t < 18.2) sceneNoCurve(ctx, t);
  if (t >= 18 && t < 20.1) sceneTimeline(ctx, t);
  sceneFees(ctx, t);
  sceneCustody(ctx, t);
  sceneStats(ctx, t);
  sceneEnd(ctx, t);
  wipe(ctx, t);

  // flash on the two big hits
  const fl = Math.max(t >= 8 ? 1 - seg(t, 8.0, 8.22) : 0, t >= 29 ? 1 - seg(t, 29.0, 29.22) : 0);
  if (fl > 0) {
    ctx.fillStyle = `rgba(242,243,238,${0.22 * fl})`;
    ctx.fillRect(0, 0, W, H);
  }

  vignette(ctx);

  // fade in from black / out to black
  const fb = Math.max(1 - seg(t, 0, 0.08), seg(t, DURATION - 0.3, DURATION));
  if (fb > 0) {
    ctx.fillStyle = `rgba(0,0,0,${fb})`;
    ctx.fillRect(0, 0, W, H);
  }
}
