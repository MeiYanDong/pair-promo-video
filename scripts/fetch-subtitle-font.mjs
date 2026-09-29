// Downloads Noto Sans SC (OFL) subset to exactly the characters used by the
// subtitle tracks, via Google Fonts' `text=` parameter. Re-run after editing
// src/subtitles.js:  node scripts/fetch-subtitle-font.mjs
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { SUBS } from '../src/subtitles.js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const chars = [...new Set(Object.values(SUBS).flat().map((s) => s.text).join('').replace(/\n/g, ''))].sort().join('');
const css = execFileSync('curl', ['-sS', `https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@500&text=${encodeURIComponent(chars)}`]).toString();
const url = css.match(/url\((\S+?)\)/)?.[1];
if (!url) throw new Error(`no font url in response:\n${css}`);
const out = join(ROOT, 'assets/fonts/NotoSansSC-500-subset.ttf');
execFileSync('curl', ['-sS', '-o', out, url]);
console.log(`${out} (${chars.length} glyphs)`);
