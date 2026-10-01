/* Persistence. Keys are the v2 bodyweight schema — keep compatible, only add fields.
   history entry: { workout, started, ended?, entries:[{ key, name, level, type, sets:[{ r, done }] }] }
   meta (for sync merging): { levelsAt:{ key: ts }, settingsAt: ts, deleted:[started…] } */
const LS = {
  hist: "wo_history_v2",
  lvl: "wo_levels_v2",
  settings: "wo_settings_v2",
  session: "wo_session_v2",
  meta: "wo_meta_v2",
};
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

let history  = load(LS.hist, []);
let levels   = load(LS.lvl, {});
let settings = Object.assign({ weeklyGoal: 3, sound: true, vibrate: true, wakeLock: true, equipment: [...EQUIP_DEFAULT] }, load(LS.settings, {}));
let session  = load(LS.session, null);
let meta     = Object.assign({ levelsAt: {}, settingsAt: 0, deleted: [] }, load(LS.meta, {}));

/* Settings that follow you across devices; sound/vibration/wake-lock stay per device. */
const SYNCED_SETTINGS = ["weeklyGoal", "sets", "equipment", "equipmentChosen", "profile", "deload"];
const syncedSettings = () => Object.fromEntries(SYNCED_SETTINGS.filter(k => settings[k] !== undefined).map(k => [k, settings[k]]));
let syncedSnap = JSON.stringify(syncedSettings());

/* Sync hooks in here (js/core/sync.js); a no-op until then. */
let onDataChanged = () => {};

const saveMeta     = () => save(LS.meta, meta);
const saveHistory  = () => { save(LS.hist, history); onDataChanged(); };
const saveSession  = () => session ? save(LS.session, session) : localStorage.removeItem(LS.session);
function saveSettings() {
  save(LS.settings, settings);
  const snap = JSON.stringify(syncedSettings());
  if (snap !== syncedSnap) { syncedSnap = snap; meta.settingsAt = Date.now(); saveMeta(); onDataChanged(); }
}
function saveLevel(key, idx) {
  levels[key] = idx; meta.levelsAt[key] = Date.now();
  save(LS.lvl, levels); saveMeta(); onDataChanged();
}
function deleteSession(idx) {
  const [h] = history.splice(idx, 1);
  if (h) { meta.deleted.push(h.started); saveMeta(); }
  saveHistory();
}

/* ---- Import / export (merge, never clobber) ---- */
function exportData() {
  return JSON.stringify({ app: "calisthenics", version: 2, exported: Date.now(), history, levels, settings }, null, 1);
}
function importData(text) {
  const d = JSON.parse(text);
  if (!d || !Array.isArray(d.history)) throw new Error("Not a workout backup file.");
  const have = new Set(history.map(h => h.started));
  const fresh = d.history.filter(h => h && h.started && !have.has(h.started));
  history = [...history, ...fresh].sort((a, b) => a.started - b.started);
  let raised = 0;
  Object.entries(d.levels || {}).forEach(([k, v]) => {
    if (num(v) > (levels[k] ?? 0)) { levels[k] = num(v); meta.levelsAt[k] = Date.now(); raised++; }
  });
  save(LS.lvl, levels); saveMeta();
  saveHistory();
  return { added: fresh.length, raised };
}
