#!/usr/bin/env node
// Builds index.html for the Motion Lookbook: one segment per technique, each a registry item or house component
// mounted with its variables, labelled with its number, technique and source. Add a row to SEGMENTS, re-run, render:
//   node build.mjs && npx hyperframes check && npx hyperframes render -o motion-lookbook-v00N.mp4 --workers 3
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const W = 1080, H = 1920, GOLD = '#C5A759';
const track = JSON.parse(fs.readFileSync(path.join(HERE, 'assets', 'moving-target.track.json'), 'utf8')).samples
  .map(s => ({ t: s.t, x: s.x, y: s.y, w: s.w, h: s.h }));
const words = 'Captions land on the word, in the accent, above the chin line.'.split(' ')
  .map((text, i) => ({ text, start: +(0.25 + i * 0.3).toFixed(2), end: +(0.25 + i * 0.3 + 0.26).toFixed(2) }));

// box: full = whole frame; wide = a 16:9 registry block scaled to the frame width; cover = 16:9 scaled to fill 9:16.
const SEGMENTS = [
  { title: true, dur: 2.5 },
  { label: 'Kinetic type', name: 'per-word-rise', src: 'components/per-word-rise.html', dur: 3.5, vars: { text: 'THE PICTURE SAYS WHAT THE VOICE SAYS', accent: 'green' } },
  { label: 'Headline slam', name: 'headline-slam', src: 'components/headline-slam.html', dur: 3.5, vars: { text: 'Intent beats volume', accent_word_index: 0, accent: 'green' }, note: 'has a 3-frame shake: off-style for house' },
  { label: 'Giant word', name: 'house-giant-word', src: 'components/house-giant-word/house-giant-word.html', dur: 3, vars: { text: 'DEAD.', face: 'serif-italic', size: 34, y: 30, ground: '#163227' }, house: true },
  { label: 'Stat count-up', name: 'house-stat', src: 'components/house-stat/house-stat.html', dur: 3.5, vars: { label: 'CREDIT LIMIT', from: 0, to: 10000, prefix: '$', suffix: '', source: 'Example values' }, house: true, box: 'band' },
  { label: 'Count-up', name: 'count-up', src: 'components/count-up.html', dur: 3, vars: { start: 0, end: 90, suffix: '%', accent: 'green' } },
  { label: 'Mask reveal', name: 'svg-mask-reveal', src: 'components/svg-mask-reveal.html', dur: 3.5, vars: { text: 'REVEAL' } },
  { label: 'Lower third', name: 'house-lower-third', src: 'components/house-lower-third/house-lower-third.html', dur: 4, vars: { name: 'Name Surname', role: 'Role, Company' }, house: true },
  { label: 'Source card', name: 'house-source-card', src: 'components/house-source-card/house-source-card.html', dur: 4, vars: {}, house: true, box: 'band' },
  { label: 'Prompt card', name: 'house-prompt-card', src: 'components/house-prompt-card/house-prompt-card.html', dur: 5, vars: {}, house: true, box: 'band' },
  { label: 'Camera push', name: 'push-in', src: 'components/push-in.html', dur: 4, vars: { text: 'Focus', intensity: 'standard' } },
  { label: 'Whip transition', name: 'whip-pan-cut', src: 'components/whip-pan-cut.html', dur: 1.2, vars: { direction: 'left', accent: 'green' } },
  { label: 'Tracked callout', name: 'house-track-callout', src: 'components/house-track-callout/house-track-callout.html', dur: 4, vars: { track: JSON.stringify(track), label: 'Tracked by studio track' }, house: true, video: 'assets/moving-target.mp4' },
  { label: 'Captions on WebGPU', name: 'house-captions', src: 'components/house-captions/house-captions.html', dur: 4, vars: { words: JSON.stringify(words), y: 66 }, house: true, under: { name: 'mesh-gradient', src: 'mesh-gradient.html', box: 'cover', noTimeline: true } },
  { label: 'Device mockup', name: 'device-frame-stage', src: 'components/device-frame-stage.html', dur: 5, vars: { device: 'phone', cutout: 'island', body: 'graphite' }, box: 'wide' },
  { label: 'Lower third (registry)', name: 'lt-mask-reveal', src: 'lt-mask-reveal.html', dur: 4, vars: {}, box: 'wide' },
  { label: 'Data chart', name: 'data-chart', src: 'data-chart.html', dur: 5, vars: {}, box: 'wide' },
  { label: '3D type (Three.js, WebGL)', name: 'extruded-logo', src: 'extruded-logo.html', dur: 5, vars: { text: 'STUDIO', tagline: 'Motion Lookbook', finish: 'gold' }, box: 'wide' },
  { label: 'Liquid glass (WebGPU)', name: 'liquid-glass-notification', src: 'liquid-glass-notification.html', dur: 5, vars: {}, box: 'wide' },
  { end: true, dur: 2 },
];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/'/g, '&#39;').replace(/</g, '&lt;');
const boxStyle = box => {
  if (box === 'wide') return `position:absolute;left:0;top:${Math.round((H - 1080 * W / 1920) / 2)}px;width:1920px;height:1080px;transform:scale(${W / 1920});transform-origin:0 0;`;
  if (box === 'cover') { const k = H / 1080; return `position:absolute;left:${Math.round((W - 1920 * k) / 2)}px;top:0;width:1920px;height:1080px;transform:scale(${k.toFixed(4)});transform-origin:0 0;`; }
  if (box === 'band') return 'position:absolute;left:0;top:560px;width:1080px;height:800px;';
  return 'position:absolute;inset:0;';
};

let t = 0, n = 0, z = 2;
const hosts = [], labels = [], tweens = [];
for (const s of SEGMENTS) {
  const at = +t.toFixed(3), d = s.dur;
  if (s.title || s.end) {
    const id = s.title ? 'title' : 'end';
    labels.push(`<div id="${id}" class="clip card" data-start="${at}" data-duration="${d}" data-track-index="1"><div class="card-in"><div class="k">${s.title ? 'Motion Lookbook v1' : 'End of Lookbook v1'}</div><div class="s">${s.title ? 'Studio components rendered on this PC · Ryzen 5 5600G, Radeon iGPU' : 'House components: studio motion list · Registry: npx hyperframes catalog'}</div></div></div>`);
    if (s.end) tweens.push(`tl.fromTo("#${id} .card-in", { opacity: 0, y: 24 }, { opacity: 1, y: 0, duration: 0.3, ease: "expo.out" }, ${at});`);
  } else {
    n++;
    const num = String(n).padStart(2, '0'), src = s.house ? 'house' : 'registry';
    labels.push(`<div id="lbl-${num}" class="clip lbl" data-start="${at}" data-duration="${d}" data-track-index="20"><span class="lbl-n">${num}</span> ${esc(s.label)} <span class="lbl-src">${s.name} · ${src}${s.note ? ' · ' + esc(s.note) : ''}</span></div>`);
    if (s.video) hosts.push(`<video id="vid-${num}" class="clip" src="${s.video}" muted playsinline data-start="${at}" data-duration="${d}" data-track-index="${z++}" style="position:absolute;left:0;top:0;width:${W}px;height:${H}px;object-fit:cover;z-index:${z}"></video>`);
    if (s.under) hosts.push(`<div id="${s.under.name}" data-composition-id="${s.under.name}" data-composition-src="compositions/${s.under.src}" data-start="${at}" data-duration="${d}" data-track-index="${z++}" data-width="1920" data-height="1080"${s.under.noTimeline ? ' data-no-timeline' : ''} style="${boxStyle(s.under.box)}z-index:${z}"></div>`);
    const wide = s.box === 'wide';
    hosts.push(`<div id="${s.name}" data-composition-id="${s.name}" data-composition-src="compositions/${s.src}" data-start="${at}" data-duration="${d}" data-track-index="${z++}" data-track-kind="graphics"${wide ? ' data-width="1920" data-height="1080"' : ''} data-variable-values='${esc(JSON.stringify(s.vars))}' style="${boxStyle(s.box)}z-index:${z}"></div>`);
  }
  t += d;
}
const total = +t.toFixed(3);
const fontFace = fs.readFileSync(path.join(HERE, 'assets', 'fonts', 'fonts.css'), 'utf8').replace(/url\('/g, "url('assets/fonts/");
const tokens = fs.readFileSync(path.join(HERE, 'assets', 'house', 'house.css'), 'utf8');

const html = `<!doctype html>
<html lang="en" data-resolution="portrait">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=${W}, height=${H}" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <style>
${fontFace}
${tokens}
      :root { --brand: ${GOLD}; --accent: ${GOLD}; --accent-2: #8FB9A8; --fg: #F5F3EE; --font-display: 'Inter Tight', Inter, sans-serif; }
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { width: ${W}px; height: ${H}px; overflow: hidden; background: #121417; }
      #root { position: relative; width: 100%; height: 100%; overflow: hidden; }
      #ground { position: absolute; inset: 0; background: radial-gradient(120% 80% at 50% 40%, #1d2026 0%, #121417 70%); }
      .lbl { position: absolute; left: 48px; right: 48px; top: 96px; color: #F5F3EE; font-family: Inter, sans-serif; font-weight: 700; font-size: 34px; letter-spacing: -0.01em; z-index: 200; }
      .lbl-n { color: ${GOLD}; margin-right: 10px; }
      .lbl-src { display: block; margin-top: 8px; font-weight: 500; font-size: 28px; opacity: 0.55; letter-spacing: 0.02em; }
      .card { position: absolute; inset: 0; display: grid; place-items: center; z-index: 150; }
      .card-in { text-align: center; color: #F5F3EE; }
      .card .k { font-family: 'Instrument Serif', serif; font-style: italic; font-size: 120px; line-height: 1; color: ${GOLD}; }
      .card .s { margin-top: 28px; font-family: Inter, sans-serif; font-weight: 500; font-size: 30px; opacity: 0.7; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${total}" data-width="${W}" data-height="${H}">
      <div id="ground"></div>
      ${labels.join('\n      ')}
      ${hosts.join('\n      ')}
    </div>
    <script>
      const tl = gsap.timeline({ paused: true });
      ${tweens.join('\n      ')}
      window.__timelines["main"] = tl;
      tl.seek(0);
    </script>
  </body>
</html>
`;
fs.writeFileSync(path.join(HERE, 'index.html'), html);
console.log(`index.html: ${n} technique segments + title and end · ${total} s`);
