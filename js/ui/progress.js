/* Progress: lifetime totals, consistency heatmap, reps per session, per-exercise trend. */

function exHistory(key) {
  const pts = [];
  history.forEach(h => {
    const e = (h.entries || []).find(x => x.key === key);
    if (e && doneSets(e).length) pts.push({ level: e.level ?? 0, best: bestOf(e), ts: h.started });
  });
  return pts;
}

function sparkline(vals, w, h, color) {
  if (!vals.length) return "";
  if (vals.length === 1) vals = [vals[0], vals[0]];
  const min = Math.min(...vals), max = Math.max(...vals), range = (max - min) || 1;
  const xy = vals.map((v, i) => [(i / (vals.length - 1)) * (w - 8) + 4, h - 4 - ((v - min) / range) * (h - 8)]);
  const line = xy.map(p => p.map(n => n.toFixed(1)).join(",")).join(" ");
  const [lx, ly] = xy[xy.length - 1];
  const gid = "g" + Math.random().toString(36).slice(2, 8);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" class="spark">
    <defs><linearGradient id="${gid}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${color}" stop-opacity=".35"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></linearGradient></defs>
    <polygon points="4,${h} ${line} ${(w - 4).toFixed(1)},${h}" fill="url(#${gid})"/>
    <polyline points="${line}" fill="none" stroke="${color}" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="${lx}" cy="${ly}" r="3.5" fill="${color}"/></svg>`;
}

function heatmapHtml(weeks = 16) {
  const start = addDays(startOfWeek(Date.now()), -7 * (weeks - 1)), today = startOfDay(Date.now());
  const perDay = {};
  history.forEach(h => { const d = startOfDay(h.started); perDay[d] = (perDay[d] || 0) + 1; });
  let cols = "";
  for (let wi = 0; wi < weeks; wi++) {
    let cells = "";
    for (let di = 0; di < 7; di++) {
      const d = addDays(start, wi * 7 + di), n = perDay[d] || 0;
      cells += `<i class="${n ? "on" : ""} ${d === today ? "today" : ""} ${d > today ? "future" : ""}" title="${fmtDay(d)}"></i>`;
    }
    cols += `<div class="hm-col">${cells}</div>`;
  }
  return `<div class="hm-days"><span>M</span><span></span><span>W</span><span></span><span>F</span><span></span><span>S</span></div><div class="hm-grid">${cols}</div>`;
}

function renderProgress() {
  const body = $("#progress");
  if (!history.length) {
    body.innerHTML = `<div class="page-head"><div><h1 class="display">Progress</h1></div></div>
      <div class="empty"><div class="display">Nothing yet.</div>Finish your first session and your graphs start here.</div>
      ${weightSectionHtml()}`;
    wireWeightSection();
    return;
  }
  const reps = history.reduce((s, h) => s + sessionReps(h), 0);
  const ms = history.reduce((s, h) => s + sessionMs(h), 0);
  const st = weekStreak(), rk = rank();
  const recent = history.slice(-12), vols = recent.map(sessionReps), vmax = Math.max(...vols, 1);
  const thisMonth = history.filter(h => new Date(h.started).getMonth() === new Date().getMonth() && new Date(h.started).getFullYear() === new Date().getFullYear()).length;

  const rows = ALL_EX.map(ex => {
    const pts = exHistory(ex.key); if (!pts.length) return "";
    const lv = lvlOf(ex.key), pr = bestAtLevel(ex.key, lv), unit = ex.type === "timed" ? "s" : "";
    const color = ex.workout === "B" ? "#ff6a2b" : "#d4ff3a";
    return `<div class="trend">
      <div class="trend-info">
        <div class="trend-nm">${esc(ex.levels[lv])}</div>
        <div class="trend-sub">Rung ${lv + 1}/${ex.levels.length} · ${pr ? "best " + pr + unit : "not logged at this rung"} · ${pts.length}×</div>
      </div>
      ${sparkline(pts.map(p => p.level * (ex.hi + 5) + p.best), 96, 40, color)}
    </div>`;
  }).join("");

  body.innerHTML = `
    <div class="page-head"><div><h1 class="display">Progress</h1><div class="sub">LV ${rk.level} ${rk.title} · ${rk.rungs} rungs climbed</div></div></div>
    <div class="p-tiles">
      <div class="p-tile big"><div class="display tnum">${history.length}</div><span>sessions</span></div>
      <div class="p-tile"><div class="display tnum">${reps.toLocaleString()}</div><span>reps</span></div>
      <div class="p-tile"><div class="display tnum">${ms ? fmtMins(ms) : "—"}</div><span>trained</span></div>
      <div class="p-tile fire"><div class="display tnum">${st.best}</div><span>best streak (wk)</span></div>
      <div class="p-tile"><div class="display tnum">${thisMonth}</div><span>this month</span></div>
    </div>

    <div class="section-title"><h2>Consistency</h2><span class="link">16 weeks</span></div>
    <div class="card hm">${heatmapHtml()}</div>

    <div class="section-title"><h2>Reps per session</h2><span class="link">last ${recent.length}</span></div>
    <div class="card">
      <div class="bars">
        ${recent.map((h, i) => `<div class="bar-col">
          <span class="bar-v">${vols[i]}</span>
          <div class="bar-fill ${h.workout}" style="height:${Math.max(3, vols[i] / vmax * 100)}%"></div>
          <span class="bar-x">${new Date(h.started).getDate()}</span></div>`).join("")}
      </div>
      <div class="legend"><span><i class="A"></i>Workout A</span><span><i class="B"></i>Workout B</span></div>
    </div>

    <div class="section-title"><h2>Strength trend</h2><span class="link">rungs + reps</span></div>
    <div class="card trends">${rows || '<div class="muted">Log some sets to see trends.</div>'}</div>
    ${weightSectionHtml()}`;
  wireWeightSection();
}
