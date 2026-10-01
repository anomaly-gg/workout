/* Android Back button. An installed web app closes as soon as there's no page history left, so the app keeps
   one history entry per open level of UI (a non-Home tab, a sheet, a video, a workout, a timer…) plus one guard
   under Home. Back peels one level off; on Home the guard asks for a second press before the app closes.

   Chrome skips history entries a page adds WITHOUT a user gesture when the person presses Back (anti-hijacking),
   so entries are only added right after a real tap/key press (the same tap that opened the layer). Entries left
   over when something closes by itself (a rest timer running out) are removed with a programmatic back. */
let guards = 0;          // our history entries currently on the stack
let ignorePops = 0;      // popstates we caused ourselves while trimming
const isOpen = id => !$("#" + id).classList.contains("hidden");
const LAYERS = ["vidOverlay", "sheet", "hold", "rest", "survey", "finish", "session"];

/* How many entries the current UI should have: one guard + one per open level. */
const levelsNeeded = () => 1 + (currentScreen !== "home" ? 1 : 0) + LAYERS.filter(isOpen).length;

function syncGuards(hasGesture) {
  const need = levelsNeeded();
  if (guards > need) { ignorePops++; guards--; window.history.back(); return; }   // trim one stale entry
  while (guards < need && hasGesture) { window.history.pushState({ woGuard: true }, ""); guards++; }   // one tap may restore several
}
// After the tap's own handlers have run (bubble phase), so a sheet it just opened is counted.
// isTrusted: only real taps carry the gesture Chrome requires (our own .click() calls in handleBack don't).
document.addEventListener("click", e => { if (e.isTrusted) syncGuards(true); });
document.addEventListener("keyup", e => { if (e.isTrusted) syncGuards(true); });

/* Undo one level of UI. Returns false when there's nothing left but Home. */
function handleBack() {
  if (isOpen("vidOverlay")) { closeVideo(); return true; }
  if (isOpen("sheet")) {
    $("#sheet").click();                    // same as tapping the backdrop (also cancels ask() prompts)
    if (isOpen("sheet")) closeSheet();
    return true;
  }
  if (isOpen("hold")) { closeHold(); return true; }
  if (isOpen("rest")) { endRest(false); return true; }
  if (isOpen("survey")) { if (svStep > 0) { svStep--; renderSurvey(); } else closeSurvey(); return true; }
  if (isOpen("finish")) { $("#fDone").click(); return true; }
  if (isOpen("session")) { exitSessionMenu(); return true; }
  if (currentScreen !== "home") { show("home"); return true; }
  return false;
}

window.addEventListener("popstate", () => {
  if (ignorePops > 0) { ignorePops--; return syncGuards(false); }
  guards = Math.max(0, guards - 1);
  if (!handleBack()) toast("Press back again to exit", 2500);
  syncGuards(false);                        // trims if closing left a stale entry; can't add without a tap
});
