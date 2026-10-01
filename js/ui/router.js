/* Tab screens + bottom nav. Full-screen layers (session/rest/hold/finish) manage themselves. */
const SCREENS = { home: () => renderHome(), skills: () => renderSkills(), progress: () => renderProgress(), history: () => renderHistory() };
let currentScreen = "home";

function show(screen, opts = {}) {
  currentScreen = screen;
  Object.keys(SCREENS).forEach(s => $("#" + s).classList.toggle("hidden", s !== screen));
  $$("#nav button").forEach(b => b.classList.toggle("active", b.dataset.screen === screen));
  SCREENS[screen]();
  const el = $("#" + screen);
  el.style.animation = "none"; void el.offsetWidth; el.style.animation = "";
  if (!opts.keepScroll) window.scrollTo(0, 0);
}

function showLayer(id, on) {
  $("#" + id).classList.toggle("hidden", !on);
  const anyLayer = ["session", "finish", "survey"].some(l => !$("#" + l).classList.contains("hidden"));
  $("#nav").classList.toggle("hidden", anyLayer);
  document.body.style.overflow = anyLayer ? "hidden" : "";
}
