/* Persistence. Keys are the v2 bodyweight schema — keep compatible, only add fields.
   history entry: { workout, started, ended?, entries:[{ key, name, level, type, sets:[{ r, done }] }] } */
const LS = {
  hist: "wo_history_v2",
  lvl: "wo_levels_v2",
  settings: "wo_settings_v2",
  session: "wo_session_v2",
};
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch (e) { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

let history  = load(LS.hist, []);
let levels   = load(LS.lvl, {});
let settings = Object.assign({ weeklyGoal: 3, sound: true, vibrate: true, wakeLock: true, equipment: [...EQUIP_DEFAULT] }, load(LS.settings, {}));
let session  = load(LS.session, null);

const saveHistory  = () => save(LS.hist, history);
const saveSettings = () => save(LS.settings, settings);
const saveSession  = () => session ? save(LS.session, session) : localStorage.removeItem(LS.session);

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
  saveHistory();
  let raised = 0;
  Object.entries(d.levels || {}).forEach(([k, v]) => {
    if (num(v) > (levels[k] ?? 0)) { levels[k] = num(v); raised++; }
  });
  save(LS.lvl, levels);
  return { added: fresh.length, raised };
}
