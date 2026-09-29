// Original score + sound design for the PAIR film, synthesized from scratch.
// 120 BPM, D minor (Dm, Bb, F, C), resolving to F add9 on the end card.
// SFX come from CUES in src/scene.js, so each sound sits on its exact frame.
//
//   node scripts/audio.mjs  ->  build/audio.wav (48 kHz stereo, -14 LUFS)
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { CUES, DURATION, BEAT } from '../src/scene.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(ROOT, 'build');
mkdirSync(BUILD, { recursive: true });

const SR = 48000;
const N = Math.ceil(DURATION * SR);
const bus = () => [new Float32Array(N), new Float32Array(N)];
const drums = bus();
const music = bus();
const fx = bus();
const send = bus();
const kicks = [];

// deterministic PRNG (mulberry32)
let seed = 0x5eed;
function rand() {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
const noise = () => rand() * 2 - 1;
const midi = (n) => 440 * 2 ** ((n - 69) / 12);

// RBJ biquad; .set(f, q) retunes it for sweeps
function biquad(type, f, q = 0.707) {
  let b0, b1, b2, a1, a2;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  const set = (freq, Q = q) => {
    const w = (2 * Math.PI * Math.min(freq, SR * 0.45)) / SR;
    const cs = Math.cos(w);
    const al = Math.sin(w) / (2 * Q);
    const a0 = 1 + al;
    let B0, B1, B2;
    if (type === 'lp') [B0, B1, B2] = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2];
    else if (type === 'hp') [B0, B1, B2] = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2];
    else [B0, B1, B2] = [al, 0, -al];
    b0 = B0 / a0; b1 = B1 / a0; b2 = B2 / a0; a1 = (-2 * cs) / a0; a2 = (1 - al) / a0;
  };
  set(f, q);
  const fn = (x) => {
    const y = b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
  fn.set = set;
  return fn;
}

// Render a mono generator gen(t) into a bus, panned, with optional reverb send.
function place(b, t0, dur, gen, { gain = 1, pan = 0, rev = 0 } = {}) {
  const i0 = Math.round(t0 * SR);
  const n = Math.round(dur * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  const gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < n; i++) {
    const j = i0 + i;
    if (j < 0) continue;
    if (j >= N) break;
    const v = gen(i / SR);
    b[0][j] += v * gl;
    b[1][j] += v * gr;
    if (rev) {
      send[0][j] += v * gl * rev;
      send[1][j] += v * gr * rev;
    }
  }
}

// ---------------------------------------------------------------- drums
function kick(t0, amp = 1) {
  kicks.push(t0);
  let ph = 0;
  place(drums, t0, 0.5, (t) => {
    const f = 44 + 120 * Math.exp(-t * 32);
    ph += (2 * Math.PI * f) / SR;
    const body = Math.tanh(Math.sin(ph) * Math.exp(-t * 6.5) * 1.8) * 0.85;
    const click = t < 0.004 ? noise() * (1 - t / 0.004) * 0.35 : 0;
    return (body + click) * amp;
  });
}

function clap(t0, amp = 1) {
  const bp = biquad('bp', 1500, 1.1);
  place(drums, t0, 0.45, (t) => {
    let env = 0;
    for (const d of [0, 0.01, 0.021]) if (t >= d) env = Math.max(env, Math.exp(-(t - d) * (d < 0.02 ? 110 : 14)));
    return bp(noise()) * env * 2.2 * amp;
  }, { rev: 0.18 });
}

function snare(t0, amp = 1) {
  const bp = biquad('bp', 2000, 0.8);
  let ph = 0;
  place(drums, t0, 0.25, (t) => {
    ph += (2 * Math.PI * 190) / SR;
    return (bp(noise()) * 1.6 * Math.exp(-t * 22) + Math.sin(ph) * 0.4 * Math.exp(-t * 30)) * amp;
  }, { rev: 0.12 });
}

function hat(t0, open = false, amp = 1, pan = 0.25) {
  const hp = biquad('hp', 7500, 0.7);
  place(drums, t0, open ? 0.45 : 0.08, (t) => hp(noise()) * Math.exp(-t * (open ? 9 : 55)) * 0.32 * amp, { pan });
}

function crash(t0, amp = 1) {
  const hp = biquad('hp', 4200, 0.6);
  place(drums, t0, 2.0, (t) => hp(noise()) * Math.exp(-t * 2.2) * 0.3 * amp, { rev: 0.35, pan: -0.15 });
}

// ---------------------------------------------------------------- tonal
const saw = (ph) => 2 * (ph - Math.floor(ph + 0.5));

function bassNote(t0, dur, n, amp = 1) {
  const f = midi(n);
  const lp = biquad('lp', 400, 1.1);
  let ph = 0, sph = 0;
  place(music, t0, dur + 0.05, (t) => {
    ph += f / SR;
    sph += f / SR;
    lp.set(260 + 1100 * Math.exp(-t * 14), 1.1);
    const env = Math.min(1, t / 0.006) * (t > dur ? Math.max(0, 1 - (t - dur) / 0.05) : 1);
    return (lp(saw(ph)) * 0.5 + Math.sin(2 * Math.PI * sph) * 0.42) * env * amp;
  });
}

function pad(t0, dur, notes, cutoff = 1400, amp = 1, attack = 0.25) {
  const rel = 0.8;
  notes.forEach((n, vi) => {
    [-0.09, 0, 0.09].forEach((det, di) => {
      const f = midi(n + det);
      const lp = biquad('lp', cutoff, 0.6);
      let ph = rand();
      place(music, t0, dur + rel, (t) => {
        ph += f / SR;
        const env = Math.min(1, t / attack) * (t > dur ? Math.max(0, 1 - (t - dur) / rel) : 1);
        return lp(saw(ph)) * env * 0.042 * amp;
      }, { pan: (di - 1) * 0.55 + (vi - 1) * 0.1, rev: 0.25 });
    });
  });
}

function pluck(t0, n, amp = 1, pan = 0) {
  const f = midi(n);
  const lp = biquad('lp', 3000, 0.9);
  let ph = 0;
  place(music, t0, 0.5, (t) => {
    ph += f / SR;
    lp.set(350 + 4200 * Math.exp(-t * 16), 0.9);
    const sq = ph % 1 < 0.5 ? 1 : -1;
    return lp(saw(ph) * 0.6 + sq * 0.3) * Math.exp(-t * 8) * 0.2 * amp;
  }, { pan, rev: 0.3 });
}

// ---------------------------------------------------------------- sfx
function riser(t0, t1, amp = 1) {
  const bp = biquad('bp', 300, 2.2);
  let ph = 0;
  const d = t1 - t0;
  place(fx, t0, d, (t) => {
    const k = t / d;
    bp.set(250 * 24 ** k, 2.2);
    ph += (180 * 6 ** k) / SR;
    return (bp(noise()) * (0.04 + 0.5 * k * k) + Math.sin(2 * Math.PI * ph) * 0.06 * k) * amp;
  }, { rev: 0.2 });
}

function impact(t0) {
  let ph = 0;
  const lp = biquad('lp', 900, 0.7);
  place(fx, t0, 2.4, (t) => {
    ph += (32 + 40 * Math.exp(-t * 6)) / SR;
    return Math.tanh(Math.sin(2 * Math.PI * ph) * Math.exp(-t * 2.0) * 1.6) * 0.75 + lp(noise()) * Math.exp(-t * 6) * 0.6;
  }, { rev: 0.45 });
  crash(t0, 1.2);
}

function whoosh(t0, amp = 1) {
  const bp = biquad('bp', 500, 1.4);
  const d = 0.42;
  place(fx, t0, d, (t) => {
    const k = t / d;
    bp.set(400 + 3200 * Math.sin(Math.PI * k), 1.4);
    return bp(noise()) * Math.sin(Math.PI * k) ** 2 * 0.55 * amp;
  }, { rev: 0.2 });
}

function thud(t0, amp = 1) {
  let ph = 0;
  place(fx, t0, 0.35, (t) => {
    ph += (38 + 80 * Math.exp(-t * 28)) / SR;
    return Math.sin(2 * Math.PI * ph) * Math.exp(-t * 11) * 0.55 * amp;
  });
}

function blip(t0, f0, f1, dur, decay, gain, opts = {}) {
  let ph = 0;
  place(fx, t0, dur, (t) => {
    ph += lerpF(f0, f1, Math.min(1, t / 0.04)) / SR;
    return Math.sin(2 * Math.PI * ph) * Math.exp(-t * decay) * gain;
  }, opts);
}
const lerpF = (a, b, k) => a + (b - a) * k;

function tick(t0, gain = 0.1) {
  blip(t0, 2600, 2600, 0.05, 260, gain);
}

function click(t0) {
  const hp = biquad('hp', 2500, 0.7);
  place(fx, t0, 0.04, (t) => Math.sin(2 * Math.PI * 1700 * t) * Math.exp(-t * 380) * 0.18 + hp(noise()) * Math.exp(-t * 700) * 0.25);
}

function typeKey(t0) {
  const bp = biquad('bp', 2800 + rand() * 2400, 1.2);
  place(fx, t0, 0.03, (t) => bp(noise()) * Math.exp(-t * 420) * 0.5, { pan: (rand() - 0.5) * 0.4 });
}

function ding(t0, gain = 1) {
  place(fx, t0, 1.2, (t) => {
    const e = Math.exp(-t * 4.5);
    return (Math.sin(2 * Math.PI * 1318.5 * t) * 0.6 + Math.sin(2 * Math.PI * 1975.5 * t) * 0.35 + Math.sin(2 * Math.PI * 2637 * t) * 0.12 * Math.exp(-t * 8)) * e * 0.1 * gain;
  }, { rev: 0.4 });
}

function snap(t0) {
  const bp = biquad('bp', 2600, 0.8);
  place(fx, t0, 0.3, (t) => bp(noise()) * Math.exp(-t * 55) * 0.9 + Math.sin(2 * Math.PI * 120 * t) * Math.exp(-t * 18) * 0.35, { rev: 0.3 });
}

function lock(t0) {
  [0, 0.055].forEach((d, i) => place(fx, t0 + d, 0.03, (t) => ((Math.floor(t * 2 * (2200 - i * 400)) % 2 ? 1 : -1) * Math.exp(-t * 260) * 0.09)));
}

function swipe(t0) {
  const bp = biquad('bp', 800, 1.2);
  const d = 0.3;
  place(fx, t0, d, (t) => {
    const k = t / d;
    bp.set(700 * 7 ** k, 1.2);
    return bp(noise()) * Math.sin(Math.PI * k) * 0.35;
  }, { pan: 0.2 });
}

// counter roll: ticks follow the easeOutExpo count-up (0.9 s) used on screen
function count(t0) {
  const n = 14;
  for (let k = 1; k <= n; k++) {
    const y = (k / n) * 0.999;
    const x = -Math.log2(1 - y) / 10;
    tick(t0 + x * 0.9, 0.06);
  }
}

const SFX = {
  tick: (t) => tick(t),
  whoosh: (t) => whoosh(t),
  thud: (t) => thud(t),
  pop: (t) => blip(t, 260, 950, 0.14, 26, 0.22),
  snap: (t) => snap(t),
  hit: (t) => crash(t, 0.8),
  impact: (t) => impact(t),
  click: (t) => click(t),
  type: (t) => typeKey(t),
  select: (t) => blip(t, 880, 1320, 0.12, 24, 0.09, { rev: 0.2 }),
  ding: (t) => ding(t),
  lock: (t) => lock(t),
  swipe: (t) => swipe(t),
  count: (t) => count(t),
};

// ---------------------------------------------------------------- arrangement
// chords (MIDI): Dm, Bb, F, C ; bass roots one or two octaves down
const CHORDS = [
  { pad: [62, 65, 69], root: 38, arp: [62, 65, 69, 74] }, // Dm
  { pad: [58, 62, 65], root: 34, arp: [58, 62, 65, 70] }, // Bb
  { pad: [60, 65, 69], root: 41, arp: [65, 69, 72, 77] }, // F
  { pad: [60, 64, 67], root: 36, arp: [60, 64, 67, 72] }, // C
];
const BAR = BEAT * 4;
const chordAt = (bar) => CHORDS[bar % 4];

// bar-by-bar energy map (16 bars, 2 s each)
//  0 intro · 1 groove · 2 breakdown · 3 build · 4 drop · 5-6 UI (arp) · 7-13 groove · 14 build + end · 15 tail
for (let bar = 0; bar < 14; bar++) {
  const t0 = bar * BAR;
  const c = chordAt(bar);
  const cutoff = bar === 0 ? 700 : bar === 2 ? 600 : bar === 3 ? 1600 : 2400;
  pad(t0, BAR, c.pad, cutoff, bar === 0 ? 0.8 : 1, bar === 0 ? 0.9 : 0.2);

  const groove = bar !== 0 && bar !== 2;
  for (let b = 0; b < 4; b++) {
    const tb = t0 + b * BEAT;
    const lastBeatOfBuild = (bar === 3 || bar === 13) && b === 3;
    if (groove && !lastBeatOfBuild) kick(tb);
    if (groove && bar >= 3 && (b === 1 || b === 3) && !lastBeatOfBuild) clap(tb, 0.8);
    if (groove && !lastBeatOfBuild) {
      hat(tb + BEAT / 2, bar >= 12, 1);
      if (bar >= 3) {
        hat(tb + BEAT / 4, false, 0.45, -0.25);
        hat(tb + (3 * BEAT) / 4, false, 0.45, -0.25);
      }
    }
    // bass: offbeat eighths in the groove, a held root in the breakdown
    if (groove && !lastBeatOfBuild) bassNote(tb + BEAT / 2, BEAT / 2 - 0.02, c.root, 0.9);
  }
  if (bar === 2) bassNote(t0, BAR - 0.1, c.root, 0.7);
  // plucked arpeggio from the product demo onward
  if (bar >= 5) {
    for (let s = 0; s < 16; s++) {
      const n = c.arp[(s * 3) % 4] + (s % 8 >= 6 ? 12 : 0);
      pluck(t0 + s * (BEAT / 4), n, bar >= 12 ? 0.9 : 0.7, s % 2 ? 0.35 : -0.35);
    }
  }
}

// intro heartbeat and the snare rolls into the drops
kick(0.0, 0.55);
kick(1.0, 0.45);
for (let i = 0; i < 4; i++) snare(5.0 + i * BEAT / 2, 0.25 + i * 0.07);
for (let i = 0; i < 8; i++) snare(5.5 + i * (BEAT / 8), 0.4 + i * 0.05);
for (let i = 0; i < 8; i++) snare(23.5 + i * (BEAT / 8), 0.3 + i * 0.05);
for (let i = 0; i < 8; i++) snare(28.0 + i * (BEAT / 4), 0.25 + i * 0.05);
for (let i = 0; i < 8; i++) snare(28.5 + i * (BEAT / 8), 0.45 + i * 0.05);
riser(6.9, 8.0, 0.9);
riser(27.0, 29.0, 1.0);
crash(14.75, 0.5);

// bar 14 first half: the C chord hangs while the ring of tickers spins
pad(28.0, 1.0, CHORDS[3].pad, 1200, 1, 0.1);
bassNote(28.0, 0.95, CHORDS[3].root, 0.6);
// 29.0: resolve to F add9, bright, and let it ring out
kick(29.0, 1.1);
bassNote(29.0, 2.2, 41, 0.9);
pad(29.0, 2.2, [53, 60, 65, 67, 69, 72], 3200, 1.15, 0.02);
[65, 69, 72, 76, 79, 84, 81, 77].forEach((n, i) => pluck(29.0 + i * (BEAT / 2), n, 0.8 - i * 0.07, i % 2 ? 0.4 : -0.4));

for (const c of CUES) SFX[c.k]?.(c.t);

// ---------------------------------------------------------------- mix
// Schroeder/Freeverb-style reverb on the send bus
function reverb([inL, inR]) {
  const out = [new Float32Array(N), new Float32Array(N)];
  const combs = [1557, 1617, 1491, 1422, 1277, 1356];
  const aps = [556, 441, 341];
  for (let ch = 0; ch < 2; ch++) {
    const input = ch ? inR : inL;
    const o = out[ch];
    const spread = ch ? 23 : 0;
    for (const d0 of combs) {
      const d = Math.round(((d0 + spread) * SR) / 44100);
      const buf = new Float32Array(d);
      let idx = 0, store = 0;
      for (let i = 0; i < N; i++) {
        const y = buf[idx];
        store = y * 0.75 + store * 0.25;
        buf[idx] = input[i] + store * 0.84;
        o[i] += y / combs.length;
        idx = (idx + 1) % d;
      }
    }
    for (const d0 of aps) {
      const d = Math.round(((d0 + spread) * SR) / 44100);
      const buf = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < N; i++) {
        const b = buf[idx];
        const x = o[i];
        o[i] = b - x;
        buf[idx] = x + b * 0.5;
        idx = (idx + 1) % d;
      }
    }
  }
  return out;
}

const rev = reverb(send);
if (process.env.DEBUG_LEVELS) {
  const stat = (name, [l, r]) => {
    let pk = 0, ss = 0;
    for (let i = 0; i < N; i++) { pk = Math.max(pk, Math.abs(l[i]), Math.abs(r[i])); ss += l[i] * l[i] + r[i] * r[i]; }
    console.log(name.padEnd(6), 'peak', pk.toFixed(2), 'rms', Math.sqrt(ss / (2 * N)).toFixed(3));
  };
  stat('drums', drums); stat('music', music); stat('fx', fx); stat('rev', rev);
}
kicks.sort((a, b) => a - b);
const mix = [new Float32Array(N), new Float32Array(N)];
let ki = 0, last = -10;
for (let i = 0; i < N; i++) {
  const t = i / SR;
  while (ki < kicks.length && kicks[ki] <= t) last = kicks[ki++];
  const duck = 1 - 0.55 * Math.exp(-(t - last) * 9);
  for (let ch = 0; ch < 2; ch++) {
    const v = drums[ch][i] * 0.9 + music[ch][i] * duck * 0.5 + fx[ch][i] * 0.9 + rev[ch][i] * 0.22;
    mix[ch][i] = Math.tanh(v * 0.7);
  }
}
// short fade at the very end
for (let i = N - Math.round(0.3 * SR); i < N; i++) {
  const k = (N - i) / (0.3 * SR);
  mix[0][i] *= k;
  mix[1][i] *= k;
}

function wav(file, [l, r]) {
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(l[i]), Math.abs(r[i]));
  const g = peak > 0 ? 0.89 / peak : 1;
  const data = Buffer.alloc(N * 4);
  for (let i = 0; i < N; i++) {
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, l[i] * g)) * 32767), i * 4);
    data.writeInt16LE(Math.round(Math.max(-1, Math.min(1, r[i] * g)) * 32767), i * 4 + 2);
  }
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + data.length, 4); h.write('WAVE', 8);
  h.write('fmt ', 12); h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(2, 22);
  h.writeUInt32LE(SR, 24); h.writeUInt32LE(SR * 4, 28); h.writeUInt16LE(4, 32); h.writeUInt16LE(16, 34);
  h.write('data', 36); h.writeUInt32LE(data.length, 40);
  writeFileSync(file, Buffer.concat([h, data]));
}

const raw = join(BUILD, 'audio-raw.wav');
wav(raw, mix);

// two-pass loudness normalization to -14 LUFS, -1.5 dBTP
const ff = process.env.FFMPEG || execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
const measure = spawnSync(ff, ['-hide_banner', '-i', raw, '-af', 'loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json', '-f', 'null', '-']).stderr.toString();
const stats = JSON.parse(measure.slice(measure.lastIndexOf('{'), measure.lastIndexOf('}') + 1));
const out = join(BUILD, 'audio.wav');
execFileSync(ff, ['-y', '-loglevel', 'error', '-i', raw, '-af',
  `loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${stats.input_i}:measured_TP=${stats.input_tp}:measured_LRA=${stats.input_lra}:measured_thresh=${stats.input_thresh}:offset=${stats.target_offset}:linear=true`,
  '-ar', String(SR), out]);
console.log(`wrote ${out} (input ${stats.input_i} LUFS -> -14)`);
