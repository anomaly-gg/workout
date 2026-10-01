/* Android Back button. An installed web app closes as soon as there's no page history, so the app keeps one
   guard entry: Back closes whatever is on top first, steps back through the survey, pauses (never quits) a
   workout, returns to Home — and on Home asks for a second press within 2 s before letting the app close. */
const BACK_EXIT_MS = 2000;
const isOpen = id => !$("#" + id).classList.contains("hidden");
const armBack = () => window.history.pushState({ woGuard: true }, "");

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
  if (handleBack()) return armBack();
  // On Home: the guard is used up, so the NEXT Back really closes the app. Re-arm after 2 s.
  toast("Press back again to exit", BACK_EXIT_MS);
  setTimeout(() => { if (!(window.history.state && window.history.state.woGuard)) armBack(); }, BACK_EXIT_MS);
});

armBack();
