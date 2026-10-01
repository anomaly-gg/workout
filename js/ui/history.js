/* History: sessions grouped by month; tap to expand, delete from inside. */
let openHist = null;

function renderHistory() {
  const wrap = $("#history");
  if (!history.length) {
    wrap.innerHTML = `<div class="page-head"><div><h1 class="display">History</h1></div></div>
      <div class="empty"><div class="display">Clean slate.</div>Your first session will land here.</div>`;
    return;
  }
  let html = `<div class="page-head"><div><h1 class="display">History</h1><div class="sub">${history.length} session${history.length === 1 ? "" : "s"} logged</div></div></div>`;
  let month = "";
  [...history].reverse().forEach((h, ri) => {
    const idx = history.length - 1 - ri;
    const m = new Date(h.started).toLocaleDateString(undefined, { month: "long", year: "numeric" });
    if (m !== month) { month = m; html += `<div class="h-month eyebrow">${esc(m)}</div>`; }
    const open = openHist === h.started, ms = sessionMs(h), d = new Date(h.started);
    html += `
      <div class="h-item ${open ? "open" : ""}">
        <button class="h-row" data-open="${h.started}">
          <div class="h-date"><span class="display">${d.getDate()}</span><small>${d.toLocaleDateString(undefined, { weekday: "short" })}</small></div>
          <div class="h-main">
            <div class="h-title"><span class="wtag ${h.workout === "B" ? "B" : ""}">${esc(h.workout)}</span> Workout ${esc(h.workout)}</div>
            <div class="h-sub">${fmtTime(h.started)}${ms ? " · " + fmtMins(ms) : ""} · ${sessionSets(h)} sets · ${sessionReps(h)} reps</div>
          </div>
          <span class="h-chev">${open ? "–" : "+"}</span>
        </button>
        ${open ? `<div class="h-detail">
          ${(h.entries || []).map(e => `<div class="h-ex"><span>${esc(e.name)}</span><b class="tnum">${e.sets.map(s => esc(s.r || "✓") + (e.type === "timed" ? "s" : "")).join(" · ")}</b></div>`).join("")}
          <button class="btn danger h-del" data-del="${idx}">Delete session</button>
        </div>` : ""}
      </div>`;
  });
  wrap.innerHTML = html;
  $$("#history [data-open]").forEach(b => b.onclick = () => {
    openHist = openHist === +b.dataset.open ? null : +b.dataset.open;
    const y = scrollY; renderHistory(); scrollTo(0, y);
  });
  $$("#history [data-del]").forEach(b => b.onclick = async () => {
    if (!(await ask({ title: "Delete session?", body: "This removes it from your history and stats.", ok: "Delete", danger: true }))) return;
    deleteSession(+b.dataset.del); openHist = null;
    const y = scrollY; renderHistory(); scrollTo(0, y);
  });
}
