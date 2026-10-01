/* Offline support. VERSION + FILES are stamped by _dev/deploy.py — don't edit those two lines by hand.
   Same-origin files are served from a versioned cache (whole app updates atomically); everything else
   (YouTube thumbnails / embeds) goes straight to the network. */
const VERSION = "v-0127e0c0d16b";
const FILES = ["./", "css/components.css", "css/equipment.css", "css/history.css", "css/home.css", "css/progress.css", "css/science.css", "css/session.css", "css/skills.css", "css/survey.css", "css/sync.css", "css/tokens.css", "fonts/anton.woff2", "fonts/inter.woff2", "icons/apple-touch-icon.png", "icons/favicon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/maskable-512.png", "index.html", "js/app.js", "js/core/planner.js", "js/core/profile.js", "js/core/stats.js", "js/core/store.js", "js/core/sync.js", "js/core/util.js", "js/data/cues.js", "js/data/plan.js", "js/data/science.js", "js/data/survey.js", "js/data/videos.js", "js/ui/dialogs.js", "js/ui/equipment.js", "js/ui/feedback.js", "js/ui/finish.js", "js/ui/fuel.js", "js/ui/history.js", "js/ui/hold.js", "js/ui/home.js", "js/ui/media.js", "js/ui/progress.js", "js/ui/pwa.js", "js/ui/rest.js", "js/ui/router.js", "js/ui/science.js", "js/ui/session.js", "js/ui/settings.js", "js/ui/skills.js", "js/ui/survey.js", "js/ui/sync.js", "js/ui/widgets.js", "manifest.webmanifest"];

self.addEventListener("install", e => {
  // cache: "reload" bypasses the browser's HTTP cache (Pages sends max-age=600), so a new version
  // never gets filled with stale copies of the old files.
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(FILES.map(f => new Request(f, { cache: "reload" })))));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* The page tells a waiting update to take over when it's safe (not mid-workout). */
self.addEventListener("message", e => { if (e.data === "skipWaiting") self.skipWaiting(); });

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return;
  e.respondWith(
    caches.open(VERSION)
      .then(c => c.match(e.request, { ignoreSearch: true }))
      .then(hit => hit || fetch(e.request))
  );
});
