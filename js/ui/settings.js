/* Settings sheet: weekly goal, feedback toggles, backup export / import (merge). */
function openSettings() {
  const sw = k => `<button class="switch ${settings[k] ? "on" : ""}" data-sw="${k}" aria-label="${k}"></button>`;
  openSheet(`
    <h3>Settings</h3>
    ${installPrompt && !isInstalled() ? `<div class="set-row"><div class="lbl"><b>Install app</b><small>Home-screen icon, full screen, works offline</small></div>
      <button class="btn volt" id="instBtn" style="height:40px">Install</button></div>` : ""}
    <div class="set-row"><div class="lbl"><b>Reminders</b><small>${esc(reminderStatusText())}</small></div>
      <button class="btn" id="remOpen" style="height:40px">${reminderCfg().on ? "Edit" : "Set up"}</button></div>
    <div class="set-row"><div class="lbl"><b>Sync</b><small>${esc(syncStatusText())}</small></div>
      <button class="btn ${sync.id ? "" : "volt"}" id="syOpen" style="height:40px">${sync.id ? "Manage" : "Set up"}</button></div>
    <div class="set-row"><div class="lbl"><b>Your plan</b><small>${settings.profile ? "Personalised " + new Date(settings.profile.at).toLocaleDateString() : "Not personalised yet"}</small></div>
      <button class="btn" id="svOpen" style="height:40px">${settings.profile ? "Retake survey" : "Take survey"}</button></div>
    <div class="set-row"><div class="lbl"><b>Weekly goal</b><small>Sessions per week — drives your streak</small></div>
      <div class="mini-step"><button data-goal="-1">−</button><span id="goalV">${settings.weeklyGoal}</span><button data-goal="1">+</button></div></div>
    <div class="set-row"><div class="lbl"><b>Equipment</b><small>${settings.equipment.map(EQUIP_NAME).join(", ") || "Bodyweight only"}</small></div>
      <button class="btn" id="eqOpen" style="height:40px">Change</button></div>
    <div class="set-row"><div class="lbl"><b>Sounds</b><small>Countdown beeps &amp; chimes</small></div>${sw("sound")}</div>
    <div class="set-row"><div class="lbl"><b>Vibration</b><small>Buzz when rest ends (phones)</small></div>${sw("vibrate")}</div>
    <div class="set-row"><div class="lbl"><b>Keep screen on</b><small>During a workout</small></div>${sw("wakeLock")}</div>
    <div class="data-acts">
      <button class="btn" id="expBtn">Export backup</button>
      <button class="btn" id="impBtn">Import backup</button>
      <input type="file" id="impFile" accept=".json,application/json" hidden>
    </div>
    <div class="set-foot">Data lives in this browser only. Import <b>merges</b> — it adds missing sessions and keeps your higher levels; nothing is overwritten.</div>
    <button class="btn block" style="margin-top:18px" id="setDone">Done</button>
  `, root => {
    root.querySelectorAll("[data-goal]").forEach(b => b.onclick = () => {
      settings.weeklyGoal = clamp(settings.weeklyGoal + +b.dataset.goal, 1, 7); saveSettings();
      $("#goalV").textContent = settings.weeklyGoal;
    });
    root.querySelectorAll("[data-sw]").forEach(b => b.onclick = () => {
      settings[b.dataset.sw] = !settings[b.dataset.sw]; saveSettings(); b.classList.toggle("on", settings[b.dataset.sw]);
    });
    if ($("#instBtn")) $("#instBtn").onclick = () => { closeSheet(); promptInstall(); };
    $("#remOpen").onclick = () => { closeSheet(); openReminders(); };
    $("#syOpen").onclick = () => { closeSheet(); openSync(); };
    $("#svOpen").onclick = () => { closeSheet(); openSurvey(); };
    $("#eqOpen").onclick = () => { closeSheet(); openEquipment(); };
    $("#expBtn").onclick = () => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([exportData()], { type: "application/json" }));
      a.download = "calisthenics-backup-" + new Date().toISOString().slice(0, 10) + ".json";
      a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    };
    $("#impBtn").onclick = () => $("#impFile").click();
    $("#impFile").onchange = async e => {
      const f = e.target.files[0]; if (!f) return;
      try {
        const r = importData(await f.text());
        toast(`Imported ${r.added} session${r.added === 1 ? "" : "s"}${r.raised ? `, ${r.raised} level${r.raised === 1 ? "" : "s"} raised` : ""}.`);
      } catch (err) { toast("Couldn't import: " + err.message); }
    };
    $("#setDone").onclick = () => { closeSheet(); show(currentScreen, { keepScroll: true }); };
  });
  $("#sheet").onclick = e => { if (e.target.id === "sheet") { closeSheet(); show(currentScreen, { keepScroll: true }); } };
}
