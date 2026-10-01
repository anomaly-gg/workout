/* Bodyweight UI: log sheet, Home weigh-in prompt, Progress chart + pace check. Stored in kg; shown in the survey's units. */
const weightImperial = () => (settings.profile && settings.profile.body && settings.profile.body.units) === "imperial";
const fmtWeight = kg => weightImperial() ? (kgToLb(kg)).toFixed(1) + " lb" : kg.toFixed(1) + " kg";
const toShown = kg => weightImperial() ? kgToLb(kg) : kg;
const fromShown = v => weightImperial() ? lbToKg(v) : v;

/* Home: a small prompt under the Fuel tile until today's weight is logged. */
function weighInPromptHtml() {
  const today = weights[dayKey(Date.now())];
  if (today && today.kg) return "";
  const avg = weekAvg(0);
  return `<button class="weigh-prompt" id="weighBtn"><span class="wp-ico">${ICON.plus}</span>
    <span><b>Log today's weight</b><small>${avg ? "7-day average " + fmtWeight(avg) : "Morning, before eating — keeps your targets accurate"}</small></span></button>`;
}

let wDraft = null;
function openWeightLog() {
  const last = weightEntries().pop();
  const start = last ? last.kg : (settings.profile && settings.profile.body ? num(settings.profile.body.kg) || lbToKg(num(settings.profile.body.lb)) : 70);
  wDraft = Math.round(toShown(start || 70) * 10) / 10;
  openSheet(`<div id="wBody"></div>`);
  renderWeightLog();
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}

function renderWeightLog() {
  const box = $("#wBody"); if (!box) return;
  const unit = weightImperial() ? "lb" : "kg", step = weightImperial() ? 0.2 : 0.1;
  const recent = weightEntries().slice(-7).reverse();
  box.innerHTML = `
    <h3>Log weight</h3>
    <p>Weigh in the morning, after the bathroom and before eating — same conditions every day. Single days bounce 1–2 kg; the 7-day average is what counts.</p>
    <div class="w-entry">
      <button class="icon-btn" data-w="-1" aria-label="Less">${ICON.minus}</button>
      <label><input type="number" inputmode="decimal" step="${step}" id="wInput" value="${wDraft.toFixed(1)}" aria-label="Weight in ${unit}"></label>
      <span class="w-unit">${unit}</span>
      <button class="icon-btn" data-w="1" aria-label="More">${ICON.plus}</button>
    </div>
    <button class="btn volt block" id="wSave" style="margin-top:14px">Save for today</button>
    ${recent.length ? `<div class="w-recent"><div class="eyebrow">Recent</div>${recent.map(e => `
      <div class="w-row"><span>${fmtDay(e.ts)}</span><b class="tnum">${fmtWeight(e.kg)}</b><button class="w-del" data-del="${e.key}" aria-label="Delete">${ICON.close}</button></div>`).join("")}</div>` : ""}`;

  $$("#wBody [data-w]").forEach(b => b.onclick = () => {
    wDraft = Math.max(0, Math.round((num($("#wInput").value) + step * +b.dataset.w) * 10) / 10);
    $("#wInput").value = wDraft.toFixed(1); tick();
  });
  $("#wInput").oninput = e => { wDraft = num(e.target.value); };
  $("#wInput").onfocus = e => e.target.select();
  $("#wSave").onclick = () => {
    const kg = fromShown(num($("#wInput").value));
    if (!(kg >= 30 && kg <= 300)) return toast("That doesn't look like a bodyweight — check the number.");
    logWeight(kg); closeSheet(); chime(); toast("Logged " + fmtWeight(kg));
    show(currentScreen, { keepScroll: true });
  };
  $$("#wBody [data-del]").forEach(b => b.onclick = () => { deleteWeight(b.dataset.del); renderWeightLog(); });
}

/* Daily dots + 7-day average line, last 60 days. */
function weightChartSvg(entries) {
  const W = 320, H = 120, pad = 8;
  const pts = entries.filter(e => e.ts > Date.now() - 60 * DAY);
  if (pts.length < 2) return "";
  const avg = rollingAvg(pts);
  const ys = [...pts.map(p => toShown(p.kg)), ...avg.map(toShown)];
  const min = Math.min(...ys) - 0.3, max = Math.max(...ys) + 0.3;
  const t0 = pts[0].ts, t1 = pts[pts.length - 1].ts || t0 + 1;
  const x = t => pad + (t - t0) / Math.max(1, t1 - t0) * (W - 2 * pad);
  const y = v => H - pad - (v - min) / (max - min) * (H - 2 * pad);
  const line = pts.map((p, i) => `${x(p.ts).toFixed(1)},${y(toShown(avg[i])).toFixed(1)}`).join(" ");
  return `<svg class="w-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
    ${pts.map(p => `<circle cx="${x(p.ts).toFixed(1)}" cy="${y(toShown(p.kg)).toFixed(1)}" r="2.6" fill="rgba(255,255,255,.35)"/>`).join("")}
    <polyline points="${line}" fill="none" stroke="var(--volt)" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
  </svg>`;
}

function paceMessage(goal, pc) {
  const pct = (pc.pct > 0 ? "+" : "") + pc.pct.toFixed(2) + "%";
  const target = { lose: "−0.5 to −1% a week", muscle: "+0.25 to +0.5% a week" }[goal] || "roughly steady";
  if (pc.status === "ok") return { cls: "ok", text: `${pct} this week — on track (target ${target}).` };
  const dir = pc.fix > 0 ? "add" : "trim";
  const why = goal === "lose" ? (pc.status === "slow" ? "Not dropping much." : "Dropping faster than 1% a week risks losing muscle.")
    : goal === "muscle" ? (pc.status === "slow" ? "Not gaining yet." : "Gaining faster than needed — extra is mostly fat.")
    : pc.fix > 0 ? "Drifting down." : "Drifting up.";
  return { cls: "warn", text: `${pct} this week. ${why} Target ${target} — ${dir} about 150 kcal a day.`, fix: pc.fix };
}

function weightSectionHtml() {
  const entries = weightEntries(), avg = weekAvg(0), prev = weekAvg(7);
  const goal = settings.profile ? settings.profile.goal : "general";
  const pc = paceCheck(goal), msg = pc && paceMessage(goal, pc);
  return `
    <div class="section-title"><h2>Bodyweight</h2><span class="link">7-day average</span></div>
    <div class="card w-card">
      <div class="w-top">
        <div><div class="display tnum w-big">${avg ? fmtWeight(avg) : entries.length ? fmtWeight(entries[entries.length - 1].kg) : "—"}</div>
          <div class="w-sub">${avg && prev ? `${avg - prev > 0 ? "+" : ""}${(toShown(avg) - toShown(prev)).toFixed(1)} ${weightImperial() ? "lb" : "kg"} vs last week`
            : avg ? "7-day average" : entries.length ? "Log 3+ days in a week for an average" : "No weigh-ins yet"}</div></div>
        <button class="btn volt" id="wLog">${ICON.plus} Log</button>
      </div>
      ${weightChartSvg(entries)}
      ${msg ? `<div class="w-pace ${msg.cls}">${esc(msg.text)}
        ${msg.fix && settings.profile && settings.profile.body ? `<button class="btn" id="wApply">${msg.fix > 0 ? "+" : "−"}150 kcal</button>` : ""}</div>`
        : entries.length ? `<div class="w-pace">Pace check unlocks after two weeks with 3+ weigh-ins each.</div>` : ""}
      <div class="w-foot">Weekly pace targets: fat loss 0.5–1%, muscle gain 0.25–0.5% of bodyweight (Helms 2014, Iraki 2019). The ±150 kcal step is a practical rule of thumb.</div>
    </div>`;
}

function wireWeightSection() {
  if ($("#wLog")) $("#wLog").onclick = openWeightLog;
  if ($("#wApply")) $("#wApply").onclick = () => {
    const goal = settings.profile.goal, pc = paceCheck(goal);
    if (!pc || !pc.fix) return;
    settings.profile = { ...settings.profile, kcalAdjust: (settings.profile.kcalAdjust || 0) + pc.fix };
    saveSettings(); chime();
    toast(`Daily target ${pc.fix > 0 ? "raised" : "lowered"} by 150 kcal`);
    show(currentScreen, { keepScroll: true });
  };
}
