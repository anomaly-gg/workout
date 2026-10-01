/* Sync UI: set-up sheet, join-by-link (#sync=CODE), status line, and when to sync. */
const HOSTED_URL = "https://anomaly-gg.github.io/workout/";
const syncLink = () => HOSTED_URL + "#sync=" + sync.id;

function syncStatusText() {
  if (!sync.id) return "Off";
  if (sync.error) return sync.error;
  if (!sync.last) return "Not synced yet";
  const m = Math.round((Date.now() - sync.last) / 60000);
  return "Synced " + (m < 1 ? "just now" : m < 60 ? m + " min ago" : fmtDay(sync.last));
}

function openSync() {
  openSheet(`<div id="syncBody"></div>`);
  renderSyncSheet();
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}

function renderSyncSheet(msg = "") {
  const box = $("#syncBody"); if (!box) return;
  box.innerHTML = sync.id ? `
    <h3>Sync</h3>
    <p>This device is synced. Open the link on your other device (or enter the code) to link it.</p>
    <div class="sync-code display">${formatCode(sync.id)}</div>
    <div class="sync-status ${sync.error ? "err" : ""}">${esc(syncStatusText())}</div>
    <div class="row" style="margin-top:14px">
      <button class="btn volt" id="syShare">${navigator.share ? "Share link" : "Copy link"}</button>
      <button class="btn" id="syNow">Sync now</button>
    </div>
    <div class="set-foot">Keep the code private — anyone with it can see your workout data. It's stored on your own Cloudflare worker, nowhere else.</div>
    <button class="btn danger block" style="margin-top:16px" id="syOff">Turn off sync on this device</button>`
  : `
    <h3>Sync</h3>
    <p>Keep your phone and PC in step: workouts, levels, equipment and survey answers. Each device keeps its own data too, and merging never deletes anything.</p>
    <button class="btn volt block" id="syCreate">Create a sync code</button>
    <div class="sync-or"><span>or link to an existing one</span></div>
    <div class="sync-join">
      <input id="syCode" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX" autocomplete="off" autocapitalize="characters" spellcheck="false">
      <button class="btn" id="syJoin">Link</button>
    </div>
    ${msg ? `<div class="sync-status err">${esc(msg)}</div>` : ""}
    <div class="set-foot">Your data is stored on your own Cloudflare worker under the secret code — anyone with the code can see it.</div>`;

  const busy = async (btn, fn) => {
    btn.disabled = true; btn.textContent = "Working…";
    try { await fn(); renderSyncSheet(); } catch (e) { renderSyncSheet(e.message); }
  };
  if ($("#syCreate")) $("#syCreate").onclick = e => busy(e.target, async () => { await createSyncSpace(); toast("Sync is on"); });
  if ($("#syJoin")) $("#syJoin").onclick = e => busy(e.target, async () => { await joinSyncSpace($("#syCode").value); toast("Linked — your data is merged"); });
  if ($("#syNow")) $("#syNow").onclick = e => busy(e.target, syncNow);
  if ($("#syShare")) $("#syShare").onclick = async () => {
    try {
      if (navigator.share) await navigator.share({ title: "Calisthenics sync", url: syncLink() });
      else { await navigator.clipboard.writeText(syncLink()); toast("Link copied — open it on your other device"); }
    } catch (e) {}
  };
  if ($("#syOff")) $("#syOff").onclick = async () => {
    if (await ask({ title: "Turn off sync here?", body: "This device keeps all its data; it just stops syncing. You can link it again with the code.", ok: "Turn off", danger: true })) {
      leaveSync(); toast("Sync off on this device");
    }
  };
}

/* Re-render after remote changes arrive — but never under an open workout, survey or sheet. */
onSyncApplied = () => {
  const busyLayer = ["session", "finish", "survey"].some(l => !$("#" + l).classList.contains("hidden"));
  if (!busyLayer && $("#sheet").classList.contains("hidden")) show(currentScreen, { keepScroll: true });
};

/* Join by link: …/workout/#sync=CODE */
async function checkSyncLink() {
  const m = location.hash.match(/sync=([0-9A-Za-z-]+)/);
  if (!m) return;
  window.history.replaceState(null, "", location.pathname + location.search);
  const code = normalizeCode(m[1]);
  if (sync.id === code) return toast("This device is already synced.");
  if (!(await ask({ title: "Link this device?", body: `Sync with code ${formatCode(code)}. Your data here and there gets merged — nothing is deleted.`, ok: "Link" }))) return;
  try { await joinSyncSpace(code); toast("Linked — your data is merged"); }
  catch (e) { toast(e.message, 4000); }
}

function startSync() {
  checkSyncLink();
  window.addEventListener("hashchange", checkSyncLink);   // link tapped while the app is already open
  syncNow();
  document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") syncNow(); });
  window.addEventListener("online", () => syncNow());
}
