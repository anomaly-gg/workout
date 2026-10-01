/* Home card for deload weeks: suggestion when due, banner while one is running. */
function deloadCardHtml() {
  if (deloadActive()) return `
    <div class="dl-card on">
      <div class="dl-ico">${ICON.timer}</div>
      <div class="dl-txt"><div class="eyebrow">Deload week · day ${deloadDay()} of ${DELOAD_DAYS}</div>
        <b>Easy sessions this week</b>
        <span>Fewer sets, stop 3–4 reps short of failure. Keep your usual training days — don't skip them.</span>
        <div class="dl-acts"><button class="btn" id="dlEnd">End early</button></div></div>
    </div>`;
  if (deloadDue()) return `
    <div class="dl-card">
      <div class="dl-ico">${ICON.timer}</div>
      <div class="dl-txt"><div class="eyebrow">${trainedWeeksSince(deloadState().last || 0)} weeks of training</div>
        <b>Time for a lighter week?</b>
        <span>A deload lets fatigue clear so you keep climbing. Same days, about a third fewer sets, easier effort.</span>
        <div class="dl-acts"><button class="btn volt" id="dlStart">Start deload week</button><button class="btn quiet" id="dlLater">Not now</button></div></div>
    </div>`;
  return "";
}

function wireDeloadCard() {
  const on = (id, fn, msg) => { const b = $("#" + id); if (b) b.onclick = () => { fn(); toast(msg); show("home"); }; };
  on("dlStart", startDeload, "Deload week started — easy sessions");
  on("dlLater", snoozeDeload, "OK — I'll ask again next week");
  on("dlEnd", endDeload, "Back to full training");
}
