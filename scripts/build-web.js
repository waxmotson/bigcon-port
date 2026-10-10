// Builds www/ — the single web bundle used by the iOS/Android app and by static web hosting.
// Only game assets are copied (the stray *.html experiments in static/ are left behind).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const out = path.join(root, 'www');
const IMG = /\.(png|jpe?g|gif|webp|svg|ico)$/i;

fs.rmSync(out, { recursive: true, force: true });
fs.mkdirSync(out, { recursive: true });

function copy(rel, as) { fs.cpSync(path.join(root, rel), path.join(out, as || rel)); }
function copyDir(rel, filter) {
  const src = path.join(root, rel);
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(path.join(out, rel), { recursive: true });
  for (const f of fs.readdirSync(src)) if (!filter || filter.test(f)) fs.cpSync(path.join(src, f), path.join(out, rel, f), { recursive: true });
}

['index.html', 'platform.js', 'manifest.webmanifest', 'sw.js', 'favicon.ico', 'big con logo.png'].forEach(f => copy(f));
if (fs.existsSync(path.join(root, 'build', 'icon.png'))) copy('build/icon.png', 'icon.png');
copyDir('static', IMG);
copyDir('characters', IMG);

// PeerJS (bundled so the app doesn't depend on a CDN)
const vend = path.join(root, 'node_modules', 'peerjs', 'dist', 'peerjs.min.js');
fs.mkdirSync(path.join(out, 'vendor'), { recursive: true });
if (fs.existsSync(vend)) fs.copyFileSync(vend, path.join(out, 'vendor', 'peerjs.min.js'));
else console.warn('[build-web] peerjs not installed — run `npm install` first (game will fall back to the CDN).');

const size = (function walk(d) { return fs.readdirSync(d, { withFileTypes: true }).reduce((n, e) => n + (e.isDirectory() ? walk(path.join(d, e.name)) : fs.statSync(path.join(d, e.name)).size), 0); })(out);
console.log('[build-web] www/ ready — ' + (size / 1048576).toFixed(1) + ' MB');
