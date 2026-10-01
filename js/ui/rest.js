/* Rest countdown: big ring, 3-2-1 beeps, shows what's up next. */
let restTimer = null, restEnd = 0, restTotal = 0;

function startRest(sec, ctx) {
  if (!sec) return;
  restTotal = sec; restEnd = Date.now() + sec * 1000;
  const thumb = thumbUrl(ctx.name);
  $("#rest").innerHTML = `
    <div class="r-wrap">
      <div class="eyebrow r-eyebrow">Rest</div>
      <div class="r-ring">
        ${ringSvg(1, Math.round(Math.min(280, innerWidth * .72, innerHeight * .4)), 12, "var(--volt)", `<div class="display tnum r-time" id="rTime">${fmtClock(sec)}</div><div class="eyebrow">breathe</div>`)}
      </div>
      <div class="r-ctrls">
        <button class="btn" data-adj="-15">−15s</button>
        <button class="btn" data-adj="15">+15s</button>
      </div>
      <div class="r-next">
        ${thumb ? `<div class="r-thumb">${photoHtml(ctx.name)}</div>` : ""}
        <div class="r-next-txt">
          <div class="eyebrow">${esc(ctx.label)}</div>
          <div class="display r-next-nm">${esc(ctx.name)}</div>
          <div class="r-next-sub">${esc(ctx.sub)}</div>
        </div>
      </div>
      <button class="btn-go" id="rSkip">I'm ready ${ICON.arrow}</button>
    </div>`;
  $$("#rest [data-adj]").forEach(b => b.onclick = () => {
    restEnd = Math.max(Date.now() + 1000, restEnd + +b.dataset.adj * 1000);
    restTotal = Math.max(restTotal, Math.ceil((restEnd - Date.now()) / 1000));
    updateRest();
  });
  $("#rSkip").onclick = () => endRest(false);
  $("#rest").classList.remove("hidden");
  clearInterval(restTimer);
  lastBeep = null;
  restTimer = setInterval(updateRest, 250);
  updateRest();
}

let lastBeep = null;
function updateRest() {
  const left = Math.ceil((restEnd - Date.now()) / 1000);
  if (left <= 0) return endRest(true);
  const t = $("#rTime"); if (!t) return;
  t.textContent = fmtClock(left);
  const ring = $("#rest .ring");
  setRing(ring, left / restTotal);
  ring.querySelector(".val").style.stroke = left <= 5 ? "var(--fire)" : "var(--volt)";
  if (left <= 3 && lastBeep !== left) { lastBeep = left; tick(); }
}

function endRest(finished) {
  clearInterval(restTimer); restTimer = null;
  if ($("#rest").classList.contains("hidden")) return;
  $("#rest").classList.add("hidden");
  if (finished) { chime(); buzz([200, 80, 200]); }
}
