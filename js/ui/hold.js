/* Hold timer for timed exercises: 3-2-1 lead-in, counts up toward the target, tap STOP to log. */
let holdTimer = null, holdStart = 0, holdCtx = null;

function openHold(ex, setIdx) {
  unlockAudio();
  holdCtx = { ex, setIdx, phase: "ready", count: 3 };
  const size = Math.round(Math.min(280, innerWidth * .72, innerHeight * .4));
  $("#hold").innerHTML = `
    <div class="r-wrap">
      <button class="icon-btn h-close" id="hClose" aria-label="Cancel">${ICON.close}</button>
      <div class="eyebrow r-eyebrow">${esc(curEntry().name)} · set ${setIdx + 1}</div>
      <div class="r-ring">
        ${ringSvg(0, size, 12, "var(--volt)", `<div class="display tnum r-time" id="hTime">3</div><div class="eyebrow" id="hLbl">get ready</div>`)}
      </div>
      <div class="h-target">Target <b>${ex.lo}–${ex.hi}s</b> · hold until form breaks</div>
      <button class="btn-go fire" id="hStop">Stop &amp; log</button>
    </div>`;
  $("#hClose").onclick = () => closeHold();
  $("#hStop").onclick = stopHold;
  $("#hold").classList.remove("hidden");
  tick();
  clearInterval(holdTimer);
  holdTimer = setInterval(holdTick, 1000);
}

function holdTick() {
  const c = holdCtx; if (!c) return;
  if (c.phase === "ready") {
    c.count--;
    if (c.count > 0) { $("#hTime").textContent = c.count; tick(); return; }
    c.phase = "hold"; holdStart = Date.now(); chime(); buzz(80);
    $("#hLbl").textContent = "hold";
    clearInterval(holdTimer); holdTimer = setInterval(holdTick, 200);
  }
  const secs = Math.floor((Date.now() - holdStart) / 1000);
  $("#hTime").textContent = secs;
  setRing($("#hold .ring"), secs / c.ex.hi);
  if (secs === c.ex.lo && c.lastMark !== "lo") { c.lastMark = "lo"; beep(880, 120); $("#hLbl").textContent = "target hit"; }
  if (secs === c.ex.hi && c.lastMark !== "hi") { c.lastMark = "hi"; chime(); buzz([100, 60, 100]); $("#hLbl").textContent = "top of range!"; }
}

function stopHold() {
  const c = holdCtx; if (!c) return;
  if (c.phase !== "hold") return closeHold();
  const secs = Math.floor((Date.now() - holdStart) / 1000);
  closeHold();
  const st = curEntry().sets[c.setIdx];
  st.r = String(secs); st.done = true; saveSession();
  buzz(25);
  afterSetDone();
}

function closeHold() {
  clearInterval(holdTimer); holdTimer = null; holdCtx = null;
  $("#hold").classList.add("hidden");
}
