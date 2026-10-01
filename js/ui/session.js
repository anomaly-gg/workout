/* Workout player: one exercise at a time, steppers per set, auto rest + auto advance.
   session = { workout, started, idx, entries:[{ key, level, name, type, sets:[{ r, done }] }] } (persisted) */
let elapsedTimer = null;

function startWorkout(w) {
  unlockAudio();
  if (session) return openSession();
  session = {
    workout: w, started: Date.now(), idx: 0,
    entries: PLAN[w].exercises.map(ex => {
      const aim = String(suggest(ex).aim);
      return { key: ex.key, level: lvlOf(ex.key), name: curName(ex.key), type: ex.type,
        sets: Array.from({ length: ex.sets }, () => ({ r: aim, done: false })) };
    }),
  };
  saveSession();
  openSession();
}

function openSession() {
  unlockAudio();
  showLayer("session", true);
  renderSession();
  keepAwake(true);
  clearInterval(elapsedTimer);
  elapsedTimer = setInterval(() => { const el = $("#sElapsed"); if (el && session) el.textContent = fmtClock((Date.now() - session.started) / 1000); }, 1000);
}

function closeSession() {
  clearInterval(elapsedTimer);
  keepAwake(false);
  showLayer("session", false);
  applyUpdate();   // a new app version waits until the workout is over
  scheduleSync();  // sync pauses during a workout
}

const curEx = () => PLAN[session.workout].exercises[session.idx];
const curEntry = () => session.entries[session.idx];
const entryDone = e => e.sets.every(s => s.done);

function renderSession(keepScroll = false) {
  const layer = $("#session"), y = layer.scrollTop;
  const ex = curEx(), en = curEntry(), w = session.workout;
  const lv = en.level, sg = suggest(ex), last = lastEntry(ex.key);
  const timed = ex.type === "timed", unit = timed ? "sec" : "reps";
  const total = session.entries.length, isLast = session.idx === total - 1;
  const firstOpen = en.sets.findIndex(s => !s.done);
  const target = timed ? `${ex.lo}–${ex.hi}s` : `${ex.lo}–${ex.hi} reps`;
  const lastSets = last && last.level === lv ? doneSets(last) : [];
  const nextEx = !isLast ? PLAN[w].exercises[session.idx + 1] : null;
  const allDone = session.entries.every(entryDone);

  layer.innerHTML = `
  <div class="s-wrap ${w}">
    <div class="s-top">
      <button class="icon-btn" id="sExit" aria-label="Exit">${ICON.close}</button>
      <div class="s-clock"><div class="eyebrow">Workout ${w}</div><div class="display tnum" id="sElapsed">${fmtClock((Date.now() - session.started) / 1000)}</div></div>
      <button class="btn s-finish-top" id="sFinishTop">Finish</button>
    </div>
    <div class="s-segs">
      ${session.entries.map((e, i) => {
        const pct = e.sets.filter(s => s.done).length / e.sets.length;
        return `<button class="seg ${i === session.idx ? "cur" : ""}" data-seg="${i}" aria-label="Exercise ${i + 1}"><i style="width:${pct * 100}%"></i></button>`;
      }).join("")}
    </div>

    <div class="s-stage">
      ${photoHtml(en.name, w)}
      <div class="s-shade"></div>
      <button class="how-pill" id="sHow">${PLAY_ICON}<span>How to</span></button>
      <div class="s-stage-body">
        <div class="eyebrow s-eyebrow">${session.idx + 1} / ${total} · ${esc(ex.cat)}</div>
        <div class="display s-title">${esc(en.name)}</div>
        <div class="s-chips">
          <span class="chip">${ex.sets} × ${target}</span>
          <span class="chip ${sg.tone}">${esc(sg.text)}</span>
        </div>
      </div>
    </div>

    <div class="s-cue">
      ${CUES[en.name] ? `<span class="eyebrow">Form</span>${esc(CUES[en.name])}` : ""}
      <div class="s-effort">${ICON.bolt}<span>${timed ? "Hold until your form starts to slip, not past it." : "Stop each set with 1–3 clean reps left. Full range, every rep."}</span></div>
    </div>

    <div class="s-ladder">
      <button class="icon-btn" id="sDown" ${prevRung(ex.key) === null ? "disabled" : ""} aria-label="Easier variation">${ICON.down}</button>
      <div class="s-ladder-mid">
        <div class="eyebrow">Rung ${lv + 1} of ${ex.levels.length}</div>
        ${pipsHtml(ex.key, w)}
      </div>
      <button class="${sg.ready ? "btn volt lvl-ready" : "icon-btn"}" id="sUp" ${nextRung(ex.key) === null ? "disabled" : ""} aria-label="Harder variation">
        ${ICON.up}${sg.ready ? "<span>Level up</span>" : ""}</button>
    </div>

    <div class="s-sets">
      ${en.sets.map((st, i) => `
        <div class="set ${st.done ? "done" : ""} ${i === firstOpen ? "active" : ""}" data-set="${i}">
          <div class="set-n"><span class="display">${i + 1}</span><small>${lastSets[i] ? "last " + esc(lastSets[i].r) : "set"}</small></div>
          <div class="stepper">
            <button data-step="-1" aria-label="Less">${ICON.minus}</button>
            <label><input type="number" inputmode="numeric" value="${esc(st.r)}" aria-label="Set ${i + 1} ${unit}"><span>${unit}</span></label>
            <button data-step="1" aria-label="More">${ICON.plus}</button>
          </div>
          ${timed && !st.done ? `<button class="hold-btn" data-hold aria-label="Hold timer">${ICON.timer}</button>` : ""}
          <button class="set-check" data-check aria-label="Mark set done">${ICON.check}</button>
        </div>`).join("")}
    </div>
    <button class="rest-link" id="sRest">${ICON.timer} Rest ${fmtClock(ex.rest)}</button>
  </div>

  <div class="s-dock">
    <button class="icon-btn" id="sPrev" ${session.idx === 0 ? "disabled" : ""} aria-label="Previous exercise">${ICON.back}</button>
    ${isLast
      ? `<button class="btn-go ${allDone ? "" : "quiet-go"}" id="sFinish">Finish workout ${ICON.check}</button>`
      : `<button class="s-next ${entryDone(en) ? "ready" : ""}" id="sNext"><span><small>Next</small>${esc(session.entries[session.idx + 1].name)}</span>${ICON.arrow}</button>`}
  </div>`;

  if (keepScroll) layer.scrollTop = y; else layer.scrollTop = 0;
  wireSession();
}

function wireSession() {
  const ex = curEx(), en = curEntry(), step = ex.type === "timed" ? 5 : 1;
  $("#sExit").onclick = exitSessionMenu;
  $("#sFinishTop").onclick = confirmFinish;
  $("#sHow").onclick = () => openTutorial(en.name);
  $("#sRest").onclick = () => startRest(ex.rest, restContext(false));
  $("#sDown").onclick = () => changeSessionLevel(-1);
  $("#sUp").onclick = () => changeSessionLevel(1);
  $("#sPrev").onclick = () => gotoExercise(session.idx - 1);
  if ($("#sNext")) $("#sNext").onclick = () => gotoExercise(session.idx + 1);
  if ($("#sFinish")) $("#sFinish").onclick = confirmFinish;
  $$("[data-seg]").forEach(b => b.onclick = () => gotoExercise(+b.dataset.seg));

  $$(".set").forEach(row => {
    const i = +row.dataset.set, st = en.sets[i], inp = row.querySelector("input");
    inp.oninput = () => { st.r = inp.value; saveSession(); };
    inp.onfocus = () => inp.select();
    row.querySelectorAll("[data-step]").forEach(b => b.onclick = () => {
      st.r = String(Math.max(0, num(st.r) + step * +b.dataset.step));
      inp.value = st.r; saveSession(); tick();
    });
    row.querySelector("[data-check]").onclick = () => toggleSet(i);
    const hb = row.querySelector("[data-hold]");
    if (hb) hb.onclick = () => openHold(ex, i);
  });
}

function gotoExercise(i) {
  if (i < 0 || i >= session.entries.length) return;
  session.idx = i; saveSession(); renderSession();
}

function changeSessionLevel(dir) {
  const ex = curEx(), en = curEntry();
  const to = stepRung(ex.key, en.level, dir);
  if (to === null) return;
  setLevel(ex.key, to);
  en.level = lvlOf(ex.key); en.name = curName(ex.key);
  const aim = String(suggest(ex).aim);
  en.sets.forEach(s => { if (!s.done) s.r = aim; });
  saveSession();
  if (dir > 0) { chime(); buzz([30, 40, 60]); toast("Level up! " + en.name); }
  renderSession(true);
}

function toggleSet(i) {
  const st = curEntry().sets[i];
  st.done = !st.done;
  if (st.done && !num(st.r)) st.r = String(suggest(curEx()).aim);
  saveSession();
  if (!st.done) return renderSession(true);
  buzz(25);
  afterSetDone();
}

/* After a set is logged: rest, and move on once an exercise is complete. */
function afterSetDone() {
  const ex = curEx(), en = curEntry();
  if (session.entries.every(entryDone)) {
    renderSession(true);
    chime(); toast("Every set done. Finish strong!");
    return;
  }
  if (entryDone(en)) {
    const nextOpen = session.entries.findIndex((e, i) => i > session.idx && !entryDone(e));
    const ctx = restContext(true, nextOpen);
    if (nextOpen >= 0) { session.idx = nextOpen; saveSession(); }
    renderSession();
    startRest(ex.rest, ctx);
  } else {
    renderSession(true);
    startRest(ex.rest, restContext(false));
  }
}

/* What the rest screen shows as "up next". */
function restContext(exerciseDone, nextIdx) {
  if (exerciseDone && nextIdx >= 0) {
    const e = session.entries[nextIdx];
    return { label: "Next exercise", name: e.name, sub: `${e.sets.length} sets · ${PLAN[session.workout].exercises[nextIdx].cat}` };
  }
  const en = curEntry(), n = en.sets.findIndex(s => !s.done);
  return { label: `Set ${n + 1} of ${en.sets.length}`, name: en.name, sub: "Same again — chase that number" };
}

function exitSessionMenu() {
  openSheet(`
    <h3>Pause workout</h3>
    <p>Your sets are saved as you go — you can come back to this.</p>
    <div class="stack">
      <button class="btn block" data-a="later">Keep it for later</button>
      <button class="btn block volt" data-a="finish">Finish &amp; save now</button>
      <button class="btn block danger" data-a="discard">Discard workout</button>
    </div>`, root => {
    root.querySelector('[data-a="later"]').onclick = () => { closeSheet(); closeSession(); show("home"); };
    root.querySelector('[data-a="finish"]').onclick = () => { closeSheet(); finishWorkout(); };
    root.querySelector('[data-a="discard"]').onclick = async () => {
      closeSheet();
      if (await ask({ title: "Discard workout?", body: "Logged sets from this session will be lost.", ok: "Discard", danger: true })) {
        session = null; saveSession(); closeSession(); show("home");
      }
    };
  });
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}

async function confirmFinish() {
  const open = session.entries.reduce((s, e) => s + e.sets.filter(x => !x.done).length, 0);
  if (open && !(await ask({ title: "Finish now?", body: `${open} set${open > 1 ? "s" : ""} not ticked off — only completed sets are saved.`, ok: "Finish", cancel: "Keep going" }))) return;
  finishWorkout();
}

function finishWorkout() {
  const entry = {
    workout: session.workout, started: session.started, ended: Date.now(),
    entries: session.entries.map(e => ({ key: e.key, name: e.name, level: e.level, type: e.type, sets: e.sets.filter(s => s.done) }))
      .filter(e => e.sets.length),
  };
  if (!entry.entries.length) {
    session = null; saveSession(); endRest(false); closeSession(); show("home");
    return toast("Nothing logged — workout not saved.");
  }
  const weekBefore = sessionsInWeek(Date.now());
  history.push(entry); saveHistory();
  session = null; saveSession();
  endRest(false);
  closeSession();
  openFinish(entry, weekBefore);
}
