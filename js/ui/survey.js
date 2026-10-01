/* Onboarding survey: goal → schedule → equipment → placement test → body (optional) → personalised plan.
   One question per screen, big tap targets, single choices auto-advance. */
let sv = null, svStep = 0;

function openSurvey() {
  if (session) return toast("Finish or discard your workout first.");
  const p = settings.profile || {};
  sv = {
    goal: p.goal, days: p.days ?? settings.weeklyGoal, sets: p.sets ?? (settings.sets || 3),
    equip: [...settings.equipment], placement: { ...(p.placement || {}) },
    body: { units: "metric", sex: "m", ...(p.body || {}) }, activity: p.activity, skipBody: false,
    applyRungs: !history.length,
  };
  svStep = 0;
  showLayer("survey", true);
  renderSurvey();
}
function closeSurvey() { showLayer("survey", false); show("home"); }

/* Steps are built from the answers so far (pull test only with a bar/rings; activity only with body stats). */
function surveySteps() {
  const s = ["intro", "goal", "days", "time", "equip"];
  PLACEMENT.forEach(t => { if (!t.needs || has(sv.equip, t.needs)) s.push("p:" + t.id); });
  s.push("body");
  if (!sv.skipBody) s.push("activity");
  s.push("result");
  return s;
}

function choiceStep(title, hint, list, val, onPick) {
  return { title, hint, body: `<div class="sv-opts">${list.map(o => `
    <button class="sv-opt ${o.id === val ? "on" : ""}" data-pick="${o.id}">
      <span><b>${esc(o.name)}</b>${o.hint ? `<small>${esc(o.hint)}</small>` : ""}</span><i>${ICON.check}</i>
    </button>`).join("")}</div>`, onPick, auto: true };
}

function stepView(id) {
  if (id === "intro") return { title: "Let's build your plan", hint: "About a minute. Your answers shape the routine, your starting level on every exercise, and — if you want — calorie and protein targets.",
    body: `<div class="sv-intro">${["Goal & schedule", "Your equipment", "Quick strength check", "Body stats (optional)"].map((t, i) =>
      `<div><span class="display">${i + 1}</span>${t}</div>`).join("")}</div>`, next: "Let's go" };
  if (id === "goal") return choiceStep("What's your main goal?", "", GOALS, sv.goal, v => sv.goal = v);
  if (id === "days") return choiceStep("How many days a week?", "Full-body sessions. The plan alternates Workout A and B.", DAYS, sv.days, v => sv.days = +v);
  if (id === "time") return choiceStep("How long per session?", "Both are backed by research — ACSM recommends at least 2 sets per exercise.", SESSION_TIME, sv.sets, v => sv.sets = +v);
  if (id === "equip") return { title: "What can you use?", hint: "Tick everything you have. Bodyweight moves are always in.",
    body: `<div class="eq-grid">${EQUIPMENT.map(e => `
      <button class="eq ${sv.equip.includes(e.id) ? "on" : ""}" data-eq="${e.id}">
        <span class="eq-ico">${EQUIP_ICON[e.id]}</span><span class="eq-nm">${esc(e.name)}</span>
        <span class="eq-hint">${esc(e.hint)}</span><span class="eq-tick">${ICON.check}</span></button>`).join("")}</div>`,
    next: sv.equip.length ? "Next" : "Just bodyweight" };
  if (id.startsWith("p:")) {
    const t = PLACEMENT.find(x => "p:" + x.id === id);
    return choiceStep(t.q, t.hint, t.opts.map((o, i) => ({ id: i, name: o })), sv.placement[t.id], v => sv.placement[t.id] = +v);
  }
  if (id === "body") return bodyStep();
  if (id === "activity") return choiceStep("How active are you overall?", "Count these workouts too. Used for your calorie estimate.", ACTIVITY, sv.activity, v => sv.activity = v);
  return resultStep();
}

function bodyStep() {
  const b = sv.body, imp = b.units === "imperial";
  return { title: "About you", hint: "Optional — only used for calorie and protein targets. Stays on this device.",
    body: `
      <div class="sv-seg">${[["metric", "Metric"], ["imperial", "Imperial"]].map(([v, l]) => `<button class="${b.units === v ? "on" : ""}" data-units="${v}">${l}</button>`).join("")}</div>
      <div class="sv-field"><label>Sex <small>(the calorie formula differs)</small></label>
        <div class="sv-seg">${[["m", "Male"], ["f", "Female"], ["x", "Prefer not to say"]].map(([v, l]) => `<button class="${b.sex === v ? "on" : ""}" data-sex="${v}">${l}</button>`).join("")}</div></div>
      <div class="sv-grid">
        <div class="sv-field"><label>Age</label><input type="number" inputmode="numeric" data-b="age" value="${b.age ?? ""}" placeholder="years"></div>
        ${imp ? `
          <div class="sv-field"><label>Height</label><div class="sv-pair">
            <input type="number" inputmode="numeric" data-b="ft" value="${b.ft ?? ""}" placeholder="ft">
            <input type="number" inputmode="numeric" data-b="inch" value="${b.inch ?? ""}" placeholder="in"></div></div>
          <div class="sv-field"><label>Weight</label><input type="number" inputmode="decimal" data-b="lb" value="${b.lb ?? ""}" placeholder="lb"></div>`
        : `
          <div class="sv-field"><label>Height</label><input type="number" inputmode="numeric" data-b="cm" value="${b.cm ?? ""}" placeholder="cm"></div>
          <div class="sv-field"><label>Weight</label><input type="number" inputmode="decimal" data-b="kg" value="${b.kg ?? ""}" placeholder="kg"></div>`}
      </div>
      <button class="btn quiet block" id="svSkipBody">Skip — no diet targets</button>`,
    next: "Next", valid: () => !!bodyMetric() };
}

/* Body stats in metric, or null if incomplete / implausible. */
function bodyMetric() {
  const b = sv.body, age = num(b.age);
  const cm = b.units === "imperial" ? ftInToCm(num(b.ft), num(b.inch)) : num(b.cm);
  const kg = b.units === "imperial" ? lbToKg(num(b.lb)) : num(b.kg);
  if (age < 10 || age > 100 || cm < 120 || cm > 230 || kg < 30 || kg > 300) return null;
  return { sex: b.sex, age, heightCm: cm, weightKg: kg };
}

function resultStep() {
  const { plan, gaps } = buildPlan(sv.equip, sv.sets);
  const mins = ["A", "B"].map(w => plan[w].exercises.reduce((s, e) => s + e.sets * (40 + e.rest), 0) / 60);
  const avgMin = Math.round((mins[0] + mins[1]) / 2 / 5) * 5;
  const body = sv.skipBody ? null : bodyMetric();
  const nut = body ? nutritionTargets({ ...body, activity: sv.activity }, sv.goal) : null;
  const goal = GOALS.find(g => g.id === sv.goal) || GOALS[3];

  return { title: "Your plan", hint: `Built for: ${goal.name.toLowerCase()} · ${sv.equip.length ? sv.equip.map(EQUIP_NAME).join(", ") : "bodyweight only"}.`,
    body: `
      <div class="sv-card">
        <div class="eyebrow">Your week</div>
        <div class="sv-big display">${sv.days} <small>days a week</small></div>
        <p>Full body, alternating Workout A and B · ${sv.sets} sets per move · about ${avgMin} min a session.</p>
        <p class="sv-focus">${esc(GOAL_FOCUS[goal.id])}</p>
      </div>

      <div class="sv-card">
        <div class="sv-card-h"><div class="eyebrow">Starting rungs</div>
          <button class="switch ${sv.applyRungs ? "on" : ""}" id="svApply" aria-label="Use these starting rungs"></button></div>
        <p class="muted sv-small">${sv.applyRungs ? "From your strength check." : "Off — your current rungs are kept."}</p>
        ${["A", "B"].map(w => `<div class="sv-w"><span class="wtag ${w}">${w}</span><div>${plan[w].exercises.map(ex => {
          const i = sv.applyRungs ? placementRung(ex, sv.placement, sv.equip) : clamp(levels[ex.key] ?? placementRung(ex, {}, sv.equip), 0, ex.levels.length - 1);
          return `<div class="sv-ex"><span>${esc(ex.levels[i])}</span><small>${i + 1}/${ex.levels.length}</small></div>`; }).join("")}</div></div>`).join("")}
      </div>

      ${nut ? nutritionCard(nut) : `<div class="sv-card"><div class="eyebrow">Fuel</div><p class="muted sv-small">Skipped. Add your stats any time from Settings → Retake survey.</p></div>`}
      ${gaps.length ? `<div class="eq-gaps"><div class="eyebrow">Heads up</div>${gaps.map(g => `<p>${esc(g)}</p>`).join("")}</div>` : ""}`,
    next: "Start my plan" };
}

function nutritionCard(n) {
  if (n.minor) return `<div class="sv-card"><div class="eyebrow">Fuel</div>${n.notes.map(t => `<p class="sv-small">${esc(t)}</p>`).join("")}</div>`;
  return `<div class="sv-card fuel">
    <div class="eyebrow">Daily fuel</div>
    <div class="fuel-row">
      <div><div class="display sv-big">${n.kcal.toLocaleString()}</div><small>kcal / day</small></div>
      <div><div class="display sv-big">${n.protein[0]}–${n.protein[1]}<small>g</small></div><small>protein / day</small></div>
    </div>
    <p class="sv-small">Maintenance ≈ ${n.tdee.toLocaleString()} kcal · pace: ${esc(n.pace)}</p>
    ${n.notes.map(t => `<p class="sv-small muted">${esc(t)}</p>`).join("")}
    <div class="fuel-src">${NUTRITION_SOURCES.map(s => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.src)} &#8599;</a>`).join("")}</div>
  </div>`;
}

function renderSurvey() {
  const steps = surveySteps();
  svStep = clamp(svStep, 0, steps.length - 1);
  const id = steps[svStep], v = stepView(id);
  const isResult = id === "result";
  $("#survey").innerHTML = `
    <div class="sv-wrap">
      <div class="sv-top">
        <button class="icon-btn" id="svBack" aria-label="Back" ${svStep === 0 ? "disabled" : ""}>${ICON.back}</button>
        <div class="sv-prog"><i style="width:${(svStep / (steps.length - 1)) * 100}%"></i></div>
        <button class="icon-btn" id="svClose" aria-label="Close">${ICON.close}</button>
      </div>
      <div class="sv-step" key="${id}">
        ${!isResult && svStep ? `<div class="eyebrow sv-count">Question ${svStep} of ${steps.length - 2}</div>` : ""}
        <h1 class="display sv-title">${esc(v.title)}</h1>
        ${v.hint ? `<p class="sv-hint">${esc(v.hint)}</p>` : ""}
        ${v.body}
      </div>
    </div>
    ${v.next ? `<div class="sv-dock"><button class="btn-go" id="svNext" ${v.valid && !v.valid() ? "disabled" : ""}>${esc(v.next)} ${ICON.arrow}</button></div>` : ""}`;
  $("#survey").scrollTop = 0;

  $("#svBack").onclick = () => { svStep--; renderSurvey(); };
  $("#svClose").onclick = closeSurvey;
  if ($("#svNext")) $("#svNext").onclick = () => isResult ? applySurvey() : (svStep++, renderSurvey());
  $$("#survey [data-pick]").forEach(b => b.onclick = () => {
    v.onPick(b.dataset.pick); tick();
    $$("#survey [data-pick]").forEach(x => x.classList.toggle("on", x === b));
    setTimeout(() => { svStep++; renderSurvey(); }, 220);
  });
  $$("#survey [data-eq]").forEach(b => b.onclick = () => {
    const e = b.dataset.eq;
    sv.equip = sv.equip.includes(e) ? sv.equip.filter(x => x !== e) : [...sv.equip, e];
    renderSurvey();
  });
  // body step
  $$("#survey [data-units]").forEach(b => b.onclick = () => { sv.body.units = b.dataset.units; renderSurvey(); });
  $$("#survey [data-sex]").forEach(b => b.onclick = () => { sv.body.sex = b.dataset.sex; renderSurvey(); });
  $$("#survey [data-b]").forEach(inp => inp.oninput = () => {
    sv.body[inp.dataset.b] = inp.value;
    $("#svNext").disabled = !bodyMetric();
  });
  if ($("#svSkipBody")) $("#svSkipBody").onclick = () => { sv.skipBody = true; svStep++; renderSurvey(); };
  if (id === "body") sv.skipBody = false;
  if ($("#svApply")) $("#svApply").onclick = () => { sv.applyRungs = !sv.applyRungs; renderSurvey(); };
}

function applySurvey() {
  const body = sv.skipBody ? null : bodyMetric();
  settings.profile = { goal: sv.goal, days: sv.days, sets: sv.sets, placement: sv.placement,
    body: body ? { ...sv.body } : null, activity: body ? sv.activity : null, at: Date.now() };
  settings.weeklyGoal = sv.days; settings.sets = sv.sets;
  settings.equipment = sv.equip; settings.equipmentChosen = true;
  saveSettings(); applyEquipment();
  if (sv.applyRungs) ALL_EX.forEach(ex => setLevel(ex.key, placementRung(ex, sv.placement, sv.equip)));
  showLayer("survey", false); show("home");
  chime(); buzz([30, 40, 60]);
  toast("Your plan is ready. Let's go.");
}

/* Current nutrition targets from the saved profile (null if none). */
function myNutrition() {
  const p = settings.profile;
  if (!p || !p.body) return null;
  const b = p.body, imp = b.units === "imperial";
  const body = { sex: b.sex, age: num(b.age), activity: p.activity,
    heightCm: imp ? ftInToCm(num(b.ft), num(b.inch)) : num(b.cm), weightKg: imp ? lbToKg(num(b.lb)) : num(b.kg) };
  return nutritionTargets(body, p.goal);
}
