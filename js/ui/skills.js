/* Skills: every exercise as a visible ladder — rungs climbed, current rung, what's ahead.
   Tap a rung for its cue, tutorial, and "set as my level". */
let skillsTab = "A", openRung = null;

function renderSkills() {
  const rk = rank();
  $("#skills").innerHTML = `
    <div class="page-head">
      <div><h1 class="display">Skills</h1>
      <div class="sub">${rk.rungs} of ${rk.total} rungs climbed · LV ${rk.level} ${rk.title}</div></div>
      <button class="eq-link" id="eqBtn">${EQUIP_ICON.bar}Equipment</button>
    </div>
    <div class="meter sk-meter"><i style="width:${rk.rungs / rk.total * 100}%"></i></div>
    <div class="seg-ctl">
      ${["A", "B"].map(w => `<button class="${skillsTab === w ? "on " + w : ""}" data-tab="${w}"><span class="wtag ${w}">${w}</span> Workout ${w}</button>`).join("")}
    </div>
    <p class="sk-hint">Tap any rung to see the cue, watch the tutorial, or set it as your level.</p>
    <div class="stack">
      ${PLAN[skillsTab].exercises.map(ex => skillCard(ex, skillsTab)).join("")}
    </div>`;

  $("#eqBtn").onclick = openEquipment;
  $$("#skills [data-tab]").forEach(b => b.onclick = () => { skillsTab = b.dataset.tab; openRung = null; renderSkills(); });
  $$("#skills [data-rung]").forEach(b => b.onclick = () => {
    openRung = openRung === b.dataset.rung ? null : b.dataset.rung;
    const y = scrollY; renderSkills(); scrollTo(0, y);
  });
  $$("#skills [data-watch]").forEach(b => b.onclick = e => { e.stopPropagation(); openTutorial(b.dataset.watch); });
  $$("#skills [data-setlvl]").forEach(b => b.onclick = e => {
    e.stopPropagation();
    const [key, i] = b.dataset.setlvl.split(":");
    const up = +i > lvlOf(key);
    setLevel(key, +i); openRung = null;
    if (up) chime();
    toast((up ? "Climbed to " : "Set to ") + curName(key));
    const y = scrollY; renderSkills(); scrollTo(0, y);
  });
}

function skillCard(ex, w) {
  const lv = lvlOf(ex.key), name = ex.levels[lv], sg = suggest(ex);
  return `
  <article class="skill ${w}" id="sk-${ex.key}">
    <div class="skill-head">
      ${photoHtml(name, w)}
      <div class="skill-shade"></div>
      <button class="how-pill" data-watch="${esc(name)}">${PLAY_ICON}<span>Watch</span></button>
      <div class="skill-head-body">
        <div class="eyebrow">${esc(ex.cat)}</div>
        <div class="display skill-name">${esc(name)}</div>
        <div class="skill-meta">
          <span class="display">${lv + 1}<small>/${ex.levels.length}</small></span>
          ${pipsHtml(ex.key, w)}
          ${sg.ready ? `<span class="chip up">Level up ready</span>` : ""}
        </div>
      </div>
    </div>
    <ol class="rungs">
      ${ex.levels.map((r, i) => {
        const id = ex.key + ":" + i, open = openRung === id;
        const ok = rungOk(ex.key, i);
        const state = !ok && i !== lv ? "na" : i < lv ? "done" : i === lv ? "cur" : "locked";
        return `<li class="rung ${state} ${open ? "open" : ""}">
          <button class="rung-row" data-rung="${id}">
            <span class="node">${!ok && i !== lv ? "<b>–</b>" : i < lv ? ICON.check : i === lv ? "" : `<b>${i + 1}</b>`}</span>
            <span class="rung-nm">${esc(r)}</span>
            ${i === lv ? `<span class="chip ${w === "B" ? "own" : "push"}">You</span>` : !ok ? `<span class="rung-next">skipped</span>` : i === nextRung(ex.key) ? `<span class="rung-next">next</span>` : ""}
          </button>
          ${open ? `<div class="rung-detail">
            ${CUES[r] ? `<p>${esc(CUES[r])}</p>` : ""}
            <div class="rung-acts">
              <button class="btn" data-watch="${esc(r)}">${PLAY_ICON} Watch tutorial</button>
              ${!ok ? `<span class="rung-need">Needs ${esc(needLabel(ex.needs[i]))} — skipped with your equipment</span>`
                : i !== lv ? `<button class="btn ${i > lv ? "volt" : ""}" data-setlvl="${id}">${i > lv ? "Climb to this" : "Drop to this"}</button>` : ""}
            </div>
          </div>` : ""}
        </li>`;
      }).join("")}
    </ol>
  </article>`;
}

function focusSkill(key) {
  const e = exDef(key); if (!e) return;
  skillsTab = e.workout; openRung = null; renderSkills();
  const card = $("#sk-" + key);
  if (card) {
    card.scrollIntoView({ block: "start" }); scrollBy(0, -12);
    card.classList.add("flash"); setTimeout(() => card.classList.remove("flash"), 1200);
  }
}
