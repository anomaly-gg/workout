/* Equipment picker: tick what you have, preview the generated A/B plan live, save to rebuild the plan. */
const EQUIP_ICON = {
  bar:   `<svg viewBox="0 0 48 48"><path d="M6 12h36M10 12v30M38 12v30"/><path d="M19 12v6a5 5 0 0 0 10 0v-6"/></svg>`,
  dips:  `<svg viewBox="0 0 48 48"><path d="M6 20h36M6 30h36M12 20v20M36 20v20M12 30v10M36 30v10"/></svg>`,
  rings: `<svg viewBox="0 0 48 48"><path d="M15 4v20M33 4v20"/><circle cx="15" cy="31" r="7"/><circle cx="33" cy="31" r="7"/></svg>`,
  band:  `<svg viewBox="0 0 48 48"><path d="M10 24c0-9 6-14 14-14s14 5 14 14-6 14-14 14-14-5-14-14z"/><path d="M15 24c0-6 4-9 9-9s9 3 9 9-4 9-9 9-9-3-9-9z"/></svg>`,
  chair: `<svg viewBox="0 0 48 48"><path d="M14 6v22h22M14 28v14M36 28v14M14 20h22"/></svg>`,
  table: `<svg viewBox="0 0 48 48"><path d="M4 18h40M10 18v24M38 18v24M10 26h28"/></svg>`,
};

let equipDraft = null;

function openEquipment() {
  if (session) return toast("Finish or discard your workout before changing equipment.");
  equipDraft = [...settings.equipment];
  openSheet(`<div id="eqBody"></div>`);
  renderEquipment();
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}

function renderEquipment() {
  const { plan, gaps } = buildPlan(equipDraft);
  const startName = ex => {
    const ok = i => has(equipDraft, ex.needs[i]);
    let i = clamp(levels[ex.key] ?? 0, 0, ex.levels.length - 1);
    if (levels[ex.key] === undefined) while (i < ex.levels.length - 1 && !ok(i)) i++;
    return ex.levels[i];
  };
  const changed = equipDraft.slice().sort().join() !== settings.equipment.slice().sort().join();

  $("#eqBody").innerHTML = `
    <h3>Your equipment</h3>
    <p>Tick what you can use. Your plan is rebuilt around it — same science, best moves for your kit. Bodyweight and floor moves are always in.</p>
    <div class="eq-grid">
      ${EQUIPMENT.map(e => `
        <button class="eq ${equipDraft.includes(e.id) ? "on" : ""}" data-eq="${e.id}">
          <span class="eq-ico">${EQUIP_ICON[e.id]}</span>
          <span class="eq-nm">${esc(e.name)}</span>
          <span class="eq-hint">${esc(e.hint)}</span>
          <span class="eq-tick">${ICON.check}</span>
        </button>`).join("")}
    </div>

    <div class="eq-preview">
      ${["A", "B"].map(w => `
        <div class="eq-w">
          <div class="eq-w-h"><span class="wtag ${w}">${w}</span> Workout ${w}</div>
          ${plan[w].exercises.map(ex => `
            <div class="eq-row ${exDef(ex.key) ? "" : "new"}">
              <span class="eq-cat">${esc(ex.cat)}</span>
              <span class="eq-ex">${esc(startName(ex))}</span>
            </div>`).join("")}
        </div>`).join("")}
    </div>

    ${gaps.length ? `<div class="eq-gaps"><div class="eyebrow">Heads up</div>${gaps.map(g => `<p>${esc(g)}</p>`).join("")}</div>`
      : `<div class="eq-gaps ok"><div class="eyebrow">Full coverage</div><p>Every movement pattern is covered with a full ladder.</p></div>`}

    <div class="row" style="margin-top:16px">
      <button class="btn" id="eqCancel">Cancel</button>
      <button class="btn volt" id="eqSave" ${changed ? "" : "disabled"}>${changed ? "Rebuild my plan" : "No changes"}</button>
    </div>
    <div class="set-foot">Your rung on each ladder is kept. Switching back later restores the same exercises and history.</div>`;

  $$("#eqBody [data-eq]").forEach(b => b.onclick = () => {
    const id = b.dataset.eq;
    equipDraft = equipDraft.includes(id) ? equipDraft.filter(x => x !== id) : [...equipDraft, id];
    const y = $(".sheet").scrollTop; renderEquipment(); $(".sheet").scrollTop = y;
  });
  $("#eqCancel").onclick = closeSheet;
  $("#eqSave").onclick = () => {
    settings.equipment = equipDraft; settings.equipmentChosen = true; saveSettings();
    applyEquipment(); closeSheet(); chime();
    toast("Plan rebuilt for your equipment");
    show(currentScreen, { keepScroll: false });
  };
}
