// Copies PeerJS out of node_modules so index.html can load it locally (offline-safe).
const fs = require('fs'), path = require('path');
const root = path.join(__dirname, '..');
const src = path.join(root, 'node_modules', 'peerjs', 'dist', 'peerjs.min.js');
const dst = path.join(root, 'vendor', 'peerjs.min.js');
try {
  fs.mkdirSync(path.dirname(dst), { recursive: true });
  fs.copyFileSync(src, dst);
  console.log('[vendor] peerjs.min.js ->', path.relative(root, dst));
} catch (e) {
  console.warn('[vendor] could not copy peerjs (index.html will fall back to the CDN):', e.message);
}
