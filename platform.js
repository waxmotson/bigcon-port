/* THE BIG CON — platform bridge
 * One tiny layer that lets the same index.html run as:
 *   - a website / installable PWA            (platform = 'web')
 *   - the Electron desktop app               (platform = 'desktop')
 *   - the Capacitor iOS (or Android) app     (platform = 'ios' | 'android')
 * The game itself never checks which one it is; it only talks to
 * window.bigconPlatform. Everything here is optional and fails quietly. */
(function () {
  'use strict';
  var cap = window.Capacitor || null;
  var isNative = !!(cap && cap.isNativePlatform && cap.isNativePlatform());
  var platform = isNative
    ? (cap.getPlatform ? cap.getPlatform() : 'native')
    : (window.discordRPC ? 'desktop' : 'web');

  /* ---- join codes: ?join=NESA, #join=NESA, thebigcon://join/NESA ---- */
  var pendingJoin = null, joinHandler = null;
  function deliverJoin(secret) {
    if (!secret) return;
    if (joinHandler) { try { joinHandler(secret); } catch (e) {} } else { pendingJoin = secret; }
  }
  function secretFromUrl(raw) {
    try {
      var u = new URL(raw, location.href);
      var q = u.searchParams.get('join');
      if (q) return q;
      var h = (u.hash || '').match(/join=([^&]+)/i);
      if (h) return decodeURIComponent(h[1]);
      var m = (u.protocol + '//' + u.host + u.pathname).match(/^thebigcon:\/\/(?:join\/?)?(.+)$/i);
      if (m && m[1]) return decodeURIComponent(m[1]);
      var p = u.pathname.match(/\/join\/([^/]+)/i);
      if (p) return decodeURIComponent(p[1]);
    } catch (e) {}
    return null;
  }
  deliverJoin(secretFromUrl(location.href));

  /* Public base URL of the hosted web build, used for invite links.
   * Set window.BIGCON_INVITE_BASE (e.g. in a tiny config script) once you know it. */
  function inviteLink(code) {
    var base = window.BIGCON_INVITE_BASE ||
      (/^https?:$/.test(location.protocol) ? location.origin + location.pathname : '');
    return base ? base + '?join=' + encodeURIComponent(code) : 'thebigcon://join/' + encodeURIComponent(code);
  }

  /* ---- Capacitor native hooks ---- */
  if (isNative && cap.Plugins && cap.Plugins.App) {
    var App = cap.Plugins.App;
    try {
      App.addListener('appUrlOpen', function (ev) { deliverJoin(secretFromUrl(ev && ev.url)); });
      App.getLaunchUrl && App.getLaunchUrl().then(function (r) { if (r && r.url) deliverJoin(secretFromUrl(r.url)); });
      /* iOS suspends WebRTC sockets in the background. The game's own heartbeat/reconnect
         notices on resume; this just pokes it so it happens immediately. */
      App.addListener('appStateChange', function (st) {
        if (st && st.isActive) { try { window.dispatchEvent(new Event('online')); } catch (e) {} }
      });
    } catch (e) {}
  }

  /* ---- character art: local first, original remote repo as a one-time fallback ---- */
  var REMOTE_CHARS = 'https://raw.githubusercontent.com/waxmotson/bigcon/main/characters/';
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG' || t.dataset.bcRetry) return;
    var src = t.getAttribute('src') || '';
    var m = src.match(/(?:^|\/)characters\/([^/?#]+)$/);
    if (m) { t.dataset.bcRetry = '1'; t.src = REMOTE_CHARS + m[1]; }
  }, true);

  /* ---- keep the screen awake during a game (where supported) ---- */
  var wakeLock = null;
  function requestWake() {
    try { if (navigator.wakeLock && document.visibilityState === 'visible')
      navigator.wakeLock.request('screen').then(function (l) { wakeLock = l; }).catch(function () {}); } catch (e) {}
  }
  document.addEventListener('visibilitychange', requestWake);
  document.addEventListener('pointerdown', function once() {
    document.removeEventListener('pointerdown', once); requestWake();
  });

  /* ---- offline cache for the hosted web build only ---- */
  if (!isNative && !window.discordRPC && 'serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function () {});
    });
  }

  window.bigconPlatform = {
    platform: platform,
    isNative: isNative,
    isDesktop: platform === 'desktop',
    inviteLink: inviteLink,
    /* index.html calls this once its join flow exists, then any queued join is replayed */
    flushJoin: function (handler) {
      joinHandler = handler;
      if (pendingJoin) { var s = pendingJoin; pendingJoin = null; setTimeout(function () { handler(s); }, 0); }
    }
  };
})();
