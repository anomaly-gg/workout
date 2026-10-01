/* Training-day reminders (Web Push via the workout-sync Worker). Per device — not synced.
   settings.reminder = { on, days:[0=Mon…6], minute } */
const VAPID_PUBLIC = "BDGkjtBlnJuIz0hYu1WMAwDShm7-Km8NjDzBOT_7AlpwU-PSXnAkwOw2eul2_8tEqGFtCTlazh4_5sAgVf8P3_4";
const DAY_NAMES = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const DEFAULT_DAYS = { 1: [2], 2: [1, 4], 3: [0, 2, 4], 4: [0, 1, 3, 4], 5: [0, 1, 2, 3, 4], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6] };

const remindersSupported = () => IS_HOSTED && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
const reminderCfg = () => settings.reminder || { on: false, days: DEFAULT_DAYS[settings.weeklyGoal] || DEFAULT_DAYS[3], minute: 18 * 60 };
const fmtMinute = m => new Date(2000, 0, 1, Math.floor(m / 60), m % 60).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

function reminderStatusText() {
  const r = reminderCfg();
  return r.on ? r.days.map(d => DAY_NAMES[d]).join(", ") + " · " + fmtMinute(r.minute) : "Off";
}

/* What the next notification says — saved where the service worker can read it. */
function saveReminderText() {
  if (!IS_HOSTED || !("caches" in window)) return;
  const w = nextWorkout(), ready = readyToLevel();
  const left = settings.weeklyGoal - sessionsInWeek(Date.now());
  const body = ready.length
    ? `${curName(ready[0].key)} → ${ready[0].levels[nextRung(ready[0].key)]} is ready. Go climb.`
    : `${left > 0 ? `${left} more to hit this week's goal · ` : ""}~${estMinutes(w)} min. Every rung counts.`;
  caches.open("wo-reminder")
    .then(c => c.put("reminder.json", new Response(JSON.stringify({ title: `Workout ${w} today`, body }), { headers: { "Content-Type": "application/json" } })))
    .catch(() => {});
}

const b64urlBytes = s => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));

async function pushSubscription(create) {
  const reg = await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub && create) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64urlBytes(VAPID_PUBLIC) });
  return sub;
}

/* Send the current schedule to the server (also refreshes timezone + sync code). */
async function registerReminder() {
  const r = reminderCfg();
  const sub = await pushSubscription(true);
  const res = await api("/v1/push", { method: "POST", body: JSON.stringify({
    endpoint: sub.endpoint, days: r.days, minute: r.minute,
    tz: Intl.DateTimeFormat().resolvedOptions().timeZone, syncId: sync.id || undefined,
  }) });
  if (res.status !== 200) throw new Error("Couldn't save reminders (" + res.status + ").");
}

async function turnRemindersOn(days, minute) {
  if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted")
    throw new Error("Notifications are blocked for this app — allow them in your browser's site settings.");
  settings.reminder = { on: true, days, minute }; saveSettings();
  saveReminderText();
  await registerReminder();
}
async function turnRemindersOff() {
  settings.reminder = { ...reminderCfg(), on: false }; saveSettings();
  const sub = await pushSubscription(false).catch(() => null);
  if (sub) { await api("/v1/push/remove", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
}

let remDraft = null;
function openReminders() {
  remDraft = { ...reminderCfg(), days: [...reminderCfg().days] };
  openSheet(`<div id="remBody"></div>`);
  renderReminders();
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}

function renderReminders(msg = "", ok = false) {
  const box = $("#remBody"); if (!box) return;
  if (!remindersSupported()) {
    box.innerHTML = `<h3>Reminders</h3>
      <p>Reminders work in the installed app. On your phone, open <b>anomaly-gg.github.io/workout</b>, install it (Settings → Install app, or the browser menu), then turn reminders on there.</p>
      <button class="btn block" id="remClose">Got it</button>`;
    $("#remClose").onclick = closeSheet;
    return;
  }
  const r = remDraft, h = String(Math.floor(r.minute / 60)).padStart(2, "0"), m = String(r.minute % 60).padStart(2, "0");
  box.innerHTML = `
    <h3>Reminders</h3>
    <p>A nudge on your training days. If you've already trained that day (and sync is on), it stays quiet.</p>
    <div class="rem-days">${DAY_NAMES.map((d, i) => `<button class="${r.days.includes(i) ? "on" : ""}" data-day="${i}">${d}</button>`).join("")}</div>
    <label class="rem-time"><span>Time</span><input type="time" id="remTime" value="${h}:${m}"></label>
    ${msg ? `<div class="sync-status ${ok ? "" : "err"}" style="margin:10px 0 0">${esc(msg)}</div>` : ""}
    <div class="row" style="margin-top:16px">
      ${reminderCfg().on ? `<button class="btn" id="remTest">Send a test</button>` : ""}
      <button class="btn volt" id="remSave" ${r.days.length ? "" : "disabled"}>${reminderCfg().on ? "Save" : "Turn on"}</button>
    </div>
    ${reminderCfg().on ? `<button class="btn danger block" style="margin-top:12px" id="remOff">Turn off reminders</button>` : ""}
    <div class="set-foot">Days default to your weekly goal of ${settings.weeklyGoal}. Full-body plans work best with a rest day between sessions.</div>`;

  $$("#remBody [data-day]").forEach(b => b.onclick = () => {
    const d = +b.dataset.day;
    r.days = r.days.includes(d) ? r.days.filter(x => x !== d) : [...r.days, d].sort();
    renderReminders();
  });
  $("#remTime").onchange = e => { const [hh, mm] = e.target.value.split(":").map(Number); if (!isNaN(hh)) r.minute = hh * 60 + (mm || 0); };
  const busy = async (btn, fn, done) => {
    btn.disabled = true; btn.textContent = "Working…";
    try { await fn(); renderReminders(done, true); } catch (e) { renderReminders(e.message); }
  };
  $("#remSave").onclick = e => busy(e.target, () => turnRemindersOn(r.days, r.minute), "Saved — " + reminderStatusText());
  if ($("#remTest")) $("#remTest").onclick = e => busy(e.target, async () => {
    saveReminderText();
    const sub = await pushSubscription(true);
    const res = await api("/v1/push/test", { method: "POST", body: JSON.stringify({ endpoint: sub.endpoint }) });
    if (res.body.status !== 201) throw new Error("Push service said " + res.body.status + ".");
  }, "Test sent — it should pop up in a few seconds.");
  if ($("#remOff")) $("#remOff").onclick = e => busy(e.target, turnRemindersOff, "Reminders off.");
}

/* On launch: keep the server's copy fresh (timezone, sync code, rotated subscriptions). */
function startReminders() {
  saveReminderText();
  if (remindersSupported() && reminderCfg().on && Notification.permission === "granted") registerReminder().catch(() => {});
}
onSyncLinked = () => { if (remindersSupported() && reminderCfg().on) registerReminder().catch(() => {}); };
