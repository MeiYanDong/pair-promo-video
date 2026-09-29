// Renders src/scene.js to video with @napi-rs/canvas + ffmpeg.
//
//   node scripts/render.mjs                    full film -> out/pair-promo.mp4
//   node scripts/render.mjs --contact          contact sheets (one frame per beat) -> build/contact-*.png
//   node scripts/render.mjs --still 29.8       single frame -> build/still-29.80.png
//
// Options: --lang zh (burned-in subtitles + .srt) --fps 60 --sub 4 (motion blur subframes) --fast-sub 16 --shutter 0.5 --workers N
//          --from 0 --to 32 --crf 16 --out path
import { spawn } from 'node:child_process';
import { availableParallelism } from 'node:os';
import { mkdirSync, writeFileSync, existsSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas, GlobalFonts, loadImage } from '@napi-rs/canvas';
import { W, H, FPS, DURATION, BEAT, FAST, IMAGE_FILES, setImages, draw as drawScene } from '../src/scene.js';
import { SUBS, toSRT } from '../src/subtitles.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BUILD = join(ROOT, 'build');
mkdirSync(BUILD, { recursive: true });

const args = process.argv.slice(2);
const opt = (name, def) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return def;
  const v = args[i + 1];
  return v === undefined || v.startsWith('--') ? true : v;
};

for (const w of [400, 500, 600, 700]) GlobalFonts.registerFromPath(join(ROOT, `assets/fonts/SpaceGrotesk-${w}.ttf`), 'Space Grotesk');
for (const w of [400, 700]) GlobalFonts.registerFromPath(join(ROOT, `assets/fonts/SpaceMono-${w}.ttf`), 'Space Mono');
GlobalFonts.registerFromPath(join(ROOT, 'assets/fonts/NotoSansSC-500-subset.ttf'), 'Noto Sans SC');

// --lang zh burns in that subtitle track
const LANG = opt('lang', null);
if (LANG && !SUBS[LANG]) throw new Error(`no subtitle track "${LANG}"`);
const draw = (ctx, t) => drawScene(ctx, t, { lang: LANG });

const images = {};
for (const [key, file] of Object.entries(IMAGE_FILES)) images[key] = await loadImage(join(ROOT, file));
setImages(images);

export async function ffmpegPath() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    const { execFileSync } = await import('node:child_process');
    return execFileSync('python3', ['-c', 'import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())']).toString().trim();
  } catch {
    return 'ffmpeg';
  }
}

function run(cmd, argv, opts = {}) {
  return new Promise((ok, fail) => {
    const p = spawn(cmd, argv, { stdio: ['pipe', 'inherit', 'inherit'], ...opts });
    p.on('exit', (code) => (code === 0 ? ok() : fail(new Error(`${cmd} exited ${code}`))));
    p.on('error', fail);
  });
}

// One frame with temporal supersampling: average `sub` samples across the shutter
// (and `fastSub` inside the FAST windows declared by the scene).
function makeFrameRenderer(baseSub, shutter, fps, fastSub = baseSub) {
  const cv = createCanvas(W, H);
  const ctx = cv.getContext('2d');
  const acc = createCanvas(W, H);
  const actx = acc.getContext('2d');
  return (t) => {
    const sub = FAST.some(([a, b]) => t >= a && t < b) ? Math.max(baseSub, fastSub) : baseSub;
    if (sub <= 1) {
      draw(ctx, t);
      return cv;
    }
    for (let i = 0; i < sub; i++) {
      const ti = t + ((i + 0.5) / sub - 0.5) * (shutter / fps);
      draw(ctx, Math.max(0, Math.min(DURATION - 1e-6, ti)));
      actx.globalAlpha = 1 / (i + 1);
      actx.drawImage(cv, 0, 0);
    }
    actx.globalAlpha = 1;
    return acc;
  };
}

async function still(t) {
  const render = makeFrameRenderer(1, 0, FPS);
  const cv = render(t);
  const file = join(BUILD, `still-${t.toFixed(2)}${LANG ? `-${LANG}` : ''}.png`);
  writeFileSync(file, cv.toBuffer('image/png'));
  console.log(file);
}

async function contact() {
  const render = makeFrameRenderer(1, 0, FPS);
  const times = [];
  for (let t = 0; t < DURATION; t += BEAT) times.push(t + 0.001);
  times.push(DURATION - 0.35);
  const cols = 4, per = 16, tw = 480, th = 270;
  for (let s = 0; s * per < times.length; s++) {
    const chunk = times.slice(s * per, s * per + per);
    const rows = Math.ceil(chunk.length / cols);
    const sheet = createCanvas(cols * tw, rows * (th + 28));
    const sctx = sheet.getContext('2d');
    sctx.fillStyle = '#222';
    sctx.fillRect(0, 0, sheet.width, sheet.height);
    chunk.forEach((t, i) => {
      const cv = render(t);
      const x = (i % cols) * tw, y = Math.floor(i / cols) * (th + 28);
      sctx.drawImage(cv, x, y + 28, tw, th);
      sctx.fillStyle = '#fff';
      sctx.font = '400 18px "Space Mono"';
      sctx.fillText(`t=${t.toFixed(2)}s`, x + 8, y + 20);
    });
    const file = join(BUILD, `contact-${s + 1}${LANG ? `-${LANG}` : ''}.png`);
    writeFileSync(file, sheet.toBuffer('image/png'));
    console.log(file);
  }
}

// Worker: render frames [f0, f1) into an H.264 segment.
async function segment(f0, f1, file, { sub, fastSub, shutter, fps, crf }) {
  const ff = await ffmpegPath();
  const p = spawn(ff, [
    '-y', '-loglevel', 'error',
    '-f', 'rawvideo', '-pix_fmt', 'rgba', '-s', `${W}x${H}`, '-r', String(fps), '-i', 'pipe:0',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', String(crf), '-tune', 'animation',
    '-pix_fmt', 'yuv420p', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv',
    file,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });
  const done = new Promise((ok, fail) => p.on('exit', (c) => (c === 0 ? ok() : fail(new Error(`ffmpeg ${c}`)))));
  const render = makeFrameRenderer(sub, shutter, fps, fastSub);
  for (let f = f0; f < f1; f++) {
    const cv = render(f / fps);
    const buf = cv.data();
    if (!p.stdin.write(buf)) await new Promise((r) => p.stdin.once('drain', r));
    if (process.send && (f - f0) % 30 === 0) process.send({ f });
  }
  p.stdin.end();
  await done;
}

async function film() {
  const fps = Number(opt('fps', FPS));
  const sub = Number(opt('sub', 4));
  const fastSub = Number(opt('fast-sub', 16));
  const shutter = Number(opt('shutter', 0.5));
  const crf = Number(opt('crf', 16));
  const from = Number(opt('from', 0));
  const to = Number(opt('to', DURATION));
  const workers = Number(opt('workers', Math.max(1, availableParallelism())));
  const out = resolve(ROOT, opt('out', LANG ? `out/pair-promo-${LANG}.mp4` : 'out/pair-promo.mp4'));
  mkdirSync(dirname(out), { recursive: true });

  const f0 = Math.round(from * fps), f1 = Math.round(to * fps);
  const n = f1 - f0;
  const per = Math.ceil(n / workers);
  const parts = [];
  const t0 = Date.now();
  console.log(`rendering ${n} frames @${fps}fps, ${sub} subframes, ${workers} workers`);
  const jobs = [];
  for (let w = 0; w < workers; w++) {
    const a = f0 + w * per, b = Math.min(f1, a + per);
    if (a >= b) break;
    const file = join(BUILD, `seg-${LANG ?? 'en'}-${String(w).padStart(2, '0')}.mp4`);
    parts.push(file);
    jobs.push(run(process.execPath, [fileURLToPath(import.meta.url), '--segment', `${a}:${b}`, '--file', file, '--fps', fps, '--sub', sub, '--fast-sub', fastSub, '--shutter', shutter, '--crf', crf, ...(LANG ? ['--lang', LANG] : [])], { stdio: ['ignore', 'inherit', 'inherit'] }));
  }
  await Promise.all(jobs);
  console.log(`frames done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);

  const list = join(BUILD, `segments-${LANG ?? 'en'}.txt`);
  writeFileSync(list, parts.map((p) => `file '${p}'`).join('\n'));
  const ff = await ffmpegPath();
  const video = join(BUILD, `video-${LANG ?? 'en'}.mp4`);
  await run(ff, ['-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', video]);
  parts.forEach((p) => existsSync(p) && unlinkSync(p));

  const audio = join(BUILD, 'audio.wav');
  if (existsSync(audio) && !opt('silent', false)) {
    await run(ff, [
      '-y', '-loglevel', 'error', '-i', video, '-ss', String(from), '-t', String(to - from), '-i', audio,
      '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000',
      '-movflags', '+faststart', '-shortest', out,
    ]);
  } else {
    await run(ff, ['-y', '-loglevel', 'error', '-i', video, '-c', 'copy', '-movflags', '+faststart', out]);
  }
  console.log(`wrote ${out}`);
  if (LANG) {
    const srt = out.replace(/\.mp4$/, '.srt');
    writeFileSync(srt, toSRT(SUBS[LANG]));
    console.log(`wrote ${srt}`);
  }
}

if (args.includes('--segment')) {
  const [a, b] = opt('segment').split(':').map(Number);
  await segment(a, b, opt('file'), {
    sub: Number(opt('sub', 4)), fastSub: Number(opt('fast-sub', 16)), shutter: Number(opt('shutter', 0.5)), fps: Number(opt('fps', FPS)), crf: Number(opt('crf', 16)),
  });
} else if (args.includes('--contact')) {
  await contact();
} else if (args.includes('--still')) {
  for (const t of String(opt('still')).split(',')) await still(Number(t));
} else {
  await film();
}
