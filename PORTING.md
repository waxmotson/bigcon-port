# THE BIG CON — one codebase, every platform

`index.html` is still the single game. Each platform is a thin shell around it:

| Platform | Shell | Run it |
|---|---|---|
| Web / PWA | static hosting of `www/` | `npm run serve` |
| Desktop (Win/Mac/Linux) | Electron + Discord Rich Presence (unchanged) | `npm start` · `npm run dist` |
| iOS | Capacitor (WKWebView) | `npm run ios:open` |

Multiplayer is PeerJS/WebRTC, so **players on any platform can join the same table**
(iPhone host ↔ Windows desktop ↔ browser guest all work).

## What changed in `index.html`
- Viewport `viewport-fit=cover` + safe-area padding (notch / home bar), `100dvh`, 44px zoom buttons, 16px inputs (stops iOS focus-zoom).
- Board: **two-finger pinch-zoom** and a touch-friendly pan threshold (mouse wheel / drag unchanged).
- Sticky `:hover` colours disabled on touch devices.
- PeerJS loads from `vendor/` first (CDN is only a fallback); character art loads from `./characters/` (old remote repo is a one-time fallback).
- Player id persists in `localStorage` in the native app (so a seat survives iOS killing the app); browsers still use per-tab `sessionStorage`.
- "Copy code" becomes the **iOS share sheet** in the app, and copies an invite **link** on the web when hosted.
- Join links work everywhere: `?join=NESA`, `thebigcon://join/NESA`, and the existing Discord invite path all go through the same join flow.
- Discord calls are untouched and still no-op outside Electron.

New files: `platform.js` (the bridge), `manifest.webmanifest` + `sw.js` (PWA/offline), `capacitor.config.json`, `scripts/`.

## iOS setup (needs a Mac, Xcode 26+, Node 22+)
```bash
npm install
npm run ios:add          # first time only: creates ios/
npm run ios:open         # builds www/, syncs, opens Xcode
```
In Xcode: pick your Team under *Signing & Capabilities*, choose a device, press Run.

1. **Icon/splash:** put a 1024×1024 `assets/icon.png` (and optional `assets/splash.png`), then `npx capacitor-assets generate --ios`.
2. **Deep links** (`thebigcon://join/NESA`): in Xcode → target *App* → *Info* → *URL Types* → add URL scheme `thebigcon`.
3. **Local network / WebRTC** needs no extra permissions (data channels only).
4. Re-run `npm run ios:sync` whenever you change `index.html`.

## Web hosting
`npm run build:web` → upload `www/` to any static host (GitHub Pages, Netlify, Cloudflare Pages). HTTPS required for the PWA/service worker.
To make invite links point at your site, add before `platform.js` in `index.html`:
`<script>window.BIGCON_INVITE_BASE='https://your.site/';</script>`

## Known limits
- iOS suspends apps in the background, which drops WebRTC; the game's existing heartbeat/reconnect rejoins the seat on return, but a **host** who backgrounds for long may need to reopen.
- Discord Rich Presence is desktop-only (Discord has no equivalent API for third-party iOS apps).
- `static/` contains old experiment `.html` files; they are excluded from every build.
- Check the TURN servers (`peerjs` public relay) stay available; for a shipped app consider your own TURN.
