/* Installable app: service worker (hosted https only — never on the localhost dev server, so local edits
   always show), the "Install app" prompt, and applying updates when not mid-workout. */
const IS_HOSTED = location.protocol === "https:" && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
let installPrompt = null, waitingWorker = null;

window.addEventListener("beforeinstallprompt", e => { e.preventDefault(); installPrompt = e; });
window.addEventListener("appinstalled", () => { installPrompt = null; toast("Installed — find it on your home screen."); });
const isInstalled = () => matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

async function promptInstall() {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
}

if (IS_HOSTED && "serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js").then(reg => {
    const watch = w => w && w.addEventListener("statechange", () => {
      if (w.state === "installed" && navigator.serviceWorker.controller) { waitingWorker = w; applyUpdate(); }
    });
    if (reg.waiting && navigator.serviceWorker.controller) { waitingWorker = reg.waiting; applyUpdate(); }
    reg.addEventListener("updatefound", () => watch(reg.installing));
    // Check for a new version whenever the app comes back to the foreground.
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") reg.update().catch(() => {}); });
  }).catch(() => {});
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => { if (!reloading) { reloading = true; location.reload(); } });
}

/* Swap to the new version now — unless a workout is running; then it waits for the session to end. */
function applyUpdate() {
  if (!waitingWorker || session) return;
  waitingWorker.postMessage("skipWaiting");
  waitingWorker = null;
}
