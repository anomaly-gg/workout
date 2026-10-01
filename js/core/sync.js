/* Phone ↔ PC sync through the workout-sync Worker (worker/). The Worker only stores a versioned document;
   every device merges locally, so nothing is ever overwritten:
   - history: union by start time, minus anything deleted on any device (tombstones)
   - levels: per exercise, the most recent change wins
   - plan settings (goal, equipment, profile…): the most recent change wins; sound/vibration stay per device */
const SYNC_URL = "https://workout-sync.xpropics.workers.dev";
const SYNC_LS = "wo_sync_v2";
let sync = Object.assign({ id: null, last: 0, error: null }, load(SYNC_LS, {}));
const saveSync = () => save(SYNC_LS, sync);

const localDoc = () => ({
  history, deleted: meta.deleted, levels, levelsAt: meta.levelsAt,
  settings: syncedSettings(), settingsAt: meta.settingsAt, weights,
});

function mergeDocs(a, b) {
  a = a || {}; b = b || {};
  const deleted = [...new Set([...(a.deleted || []), ...(b.deleted || [])])].sort((x, y) => x - y);
  const gone = new Set(deleted), byStart = new Map();
  [...(b.history || []), ...(a.history || [])].forEach(h => { if (h && h.started && !gone.has(h.started)) byStart.set(h.started, h); });
  const la = a.levels || {}, lb = b.levels || {}, levelsOut = {}, levelsAt = {};
  [...new Set([...Object.keys(la), ...Object.keys(lb)])].sort().forEach(k => {
    const ta = (a.levelsAt || {})[k] || 0, tb = (b.levelsAt || {})[k] || 0;
    const useA = !(k in lb) || (k in la && (ta > tb || (ta === tb && la[k] >= lb[k])));
    levelsOut[k] = useA ? la[k] : lb[k];
    levelsAt[k] = Math.max(ta, tb);
  });
  const sa = a.settingsAt || 0, sb = b.settingsAt || 0;
  return {
    history: [...byStart.values()].sort((x, y) => x.started - y.started),
    deleted, levels: levelsOut, levelsAt,
    settings: (sa >= sb ? a.settings : b.settings) || {}, settingsAt: Math.max(sa, sb),
    weights: mergeWeights(a.weights, b.weights),
  };
}

/* Write a merged doc into local storage without re-triggering sync. */
function applyDoc(d) {
  history = d.history; save(LS.hist, history);
  weights = d.weights || {}; save(LS_WEIGHTS, weights);
  levels = d.levels; save(LS.lvl, levels);
  meta.levelsAt = d.levelsAt; meta.deleted = d.deleted; meta.settingsAt = d.settingsAt; saveMeta();
  SYNCED_SETTINGS.forEach(k => { if (k in d.settings) settings[k] = d.settings[k]; });
  save(LS.settings, settings); syncedSnap = JSON.stringify(syncedSettings());
  applyEquipment();
}

let syncRunning = null, syncAgain = false, syncTimer = null;
let onSyncApplied = () => {};   // UI re-render hook (js/ui/sync.js)
let onSyncLinked = () => {};    // reminders re-register with the new code (js/ui/reminders.js)

async function api(path, opts = {}) {
  const r = await fetch(SYNC_URL + path, { cache: "no-store", ...opts, headers: { "Content-Type": "application/json" } });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, body };
}

/* Pull, merge, push. Retries if another device wrote in between. Returns true if local data changed. */
function syncNow() {
  if (!sync.id || session) return Promise.resolve(false);
  if (syncRunning) { syncAgain = true; return syncRunning; }
  syncRunning = (async () => {
    let changed = false;
    try {
      for (let attempt = 0; attempt < 4; attempt++) {
        const got = await api("/v1/spaces/" + sync.id);
        if (got.status === 404) throw new Error("This sync code no longer exists.");
        if (got.status !== 200) throw new Error("Sync server error (" + got.status + ").");
        const remote = mergeDocs(got.body.doc, got.body.doc);
        const merged = mergeDocs(localDoc(), remote);
        if (JSON.stringify(merged) !== JSON.stringify(mergeDocs(localDoc(), localDoc()))) { applyDoc(merged); changed = true; }
        if (JSON.stringify(merged) === JSON.stringify(remote)) break;
        const put = await api("/v1/spaces/" + sync.id, { method: "PUT", body: JSON.stringify({ doc: merged, ver: got.body.ver }) });
        if (put.status === 200) break;
        if (put.status !== 409) throw new Error("Sync server error (" + put.status + ").");
      }
      sync.last = Date.now(); sync.error = null;
    } catch (e) {
      sync.error = navigator.onLine === false ? "Offline — will sync when you're back online." : e.message || "Couldn't reach the sync server.";
    }
    saveSync();
    syncRunning = null;
    if (changed) onSyncApplied();
    if (syncAgain) { syncAgain = false; return syncNow().then(c => c || changed); }
    return changed;
  })();
  return syncRunning;
}

/* Debounced: a burst of edits (e.g. the survey setting 12 levels) becomes one sync. */
function scheduleSync() { if (!sync.id) return; clearTimeout(syncTimer); syncTimer = setTimeout(syncNow, 1500); }
onDataChanged = scheduleSync;

const normalizeCode = s => String(s || "").toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
const formatCode = id => (id || "").replace(/(.{4})(?=.)/g, "$1-");

async function createSyncSpace() {
  const r = await api("/v1/spaces", { method: "POST" });
  if (r.status !== 201) throw new Error("Couldn't create a sync code (" + r.status + ").");
  sync.id = r.body.id; saveSync();
  await syncNow();
  onSyncLinked();
}
async function joinSyncSpace(code) {
  const id = normalizeCode(code);
  if (id.length !== 20) throw new Error("A sync code has 20 letters and numbers.");
  const r = await api("/v1/spaces/" + id);
  if (r.status === 404) throw new Error("No sync found for that code.");
  if (r.status !== 200) throw new Error("Sync server error (" + r.status + ").");
  sync.id = id; saveSync();
  await syncNow();
  onSyncLinked();
}
function leaveSync() { sync = { id: null, last: 0, error: null }; saveSync(); }
