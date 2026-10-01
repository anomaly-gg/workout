/* Sensory feedback: beeps, vibration, screen wake lock, toasts. */
let audioCtx = null;
function unlockAudio() {
  if (!audioCtx) { try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) {} }
  if (audioCtx && audioCtx.state === "suspended") audioCtx.resume();
}
function beep(freq = 880, ms = 120, vol = .18) {
  if (!settings.sound || !audioCtx) return;
  const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime;
  o.type = "sine"; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + ms / 1000);
  o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t + ms / 1000 + .02);
}
const tick = () => beep(660, 90, .14);
const chime = () => { beep(990, 160, .2); setTimeout(() => beep(1320, 260, .2), 170); };
function buzz(pattern) { if (settings.vibrate) try { navigator.vibrate && navigator.vibrate(pattern); } catch (e) {} }

let wakeLock = null;
async function keepAwake(on) {
  try {
    if (on && settings.wakeLock && "wakeLock" in navigator && !wakeLock) {
      wakeLock = await navigator.wakeLock.request("screen");
      wakeLock.addEventListener("release", () => { wakeLock = null; });
    } else if (!on && wakeLock) { await wakeLock.release(); wakeLock = null; }
  } catch (e) {}
}
document.addEventListener("visibilitychange", () => { if (session && document.visibilityState === "visible") keepAwake(true); });

let toastTimer = null;
function toast(msg, ms = 2600) {
  const t = $("#toast");
  t.textContent = msg; t.classList.remove("hidden");
  t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.add("hidden"), ms);
}
