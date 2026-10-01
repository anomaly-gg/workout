/* Post-workout celebration: totals, personal bests, earned level-ups, week goal, confetti. */

function openFinish(entry, weekBefore) {
  const goal = settings.weeklyGoal, weekNow = sessionsInWeek(Date.now());
  const reps = sessionReps(entry), hold = sessionHold(entry), sets = sessionSets(entry);
  const prs = entry.entries.map(e => {
    const prev = bestAtLevel(e.key, e.level, entry.started), best = bestOf(e);
    return prev && best > prev ? { name: e.name, prev, best, unit: e.type === "timed" ? "s" : "" } : null;
  }).filter(Boolean);
  const keys = new Set(entry.entries.map(e => e.key));
  const ups = readyToLevel().filter(e => keys.has(e.key));
  const hitGoal = weekBefore < goal && weekNow >= goal;
  const st = weekStreak();

  $("#finish").innerHTML = `
    <canvas id="confetti"></canvas>
    <div class="f-wrap">
      <div class="eyebrow f-eyebrow">Workout ${entry.workout} · ${fmtDay(entry.started)}</div>
      <div class="display f-title">Done.</div>
      <p class="f-sub">${hitGoal ? `Week goal hit — ${weekNow}/${goal}. Streak: ${st.current} week${st.current === 1 ? "" : "s"}.`
        : weekNow > goal ? `Bonus session. ${weekNow} this week.` : `${weekNow}/${goal} this week. Keep stacking.`}</p>

      <div class="f-stats">
        <div><div class="display tnum">${fmtClock(sessionMs(entry) / 1000)}</div><span>time</span></div>
        <div><div class="display tnum">${sets}</div><span>sets</span></div>
        <div><div class="display tnum">${reps}</div><span>reps</span></div>
        ${hold ? `<div><div class="display tnum">${hold}s</div><span>held</span></div>` : ""}
      </div>

      ${prs.length ? `<div class="f-block">
        <div class="f-h">${ICON.trophy} New personal bests</div>
        ${prs.map(p => `<div class="f-row"><span>${esc(p.name)}</span><b>${p.prev}${p.unit} → ${p.best}${p.unit}</b></div>`).join("")}
      </div>` : ""}

      ${ups.length ? `<div class="f-block up">
        <div class="f-h">${ICON.bolt} Level-up earned</div>
        ${ups.map(e => `<div class="f-row"><span>${esc(curName(e.key))} → <b>${esc(e.levels[nextRung(e.key)])}</b></span>
          <button class="btn volt" data-climb="${e.key}">Climb</button></div>`).join("")}
      </div>` : ""}

      <div class="f-block">
        <div class="f-h">${ICON.list} Logged</div>
        ${entry.entries.map(e => `<div class="f-row"><span>${esc(e.name)}</span><span class="muted tnum">${e.sets.map(s => esc(s.r) + (e.type === "timed" ? "s" : "")).join(" · ")}</span></div>`).join("")}
      </div>

      <button class="btn-go" id="fDone">Back home</button>
    </div>`;

  $$("#finish [data-climb]").forEach(b => b.onclick = () => {
    const e = exDef(b.dataset.climb);
    setLevel(e.key, nextRung(e.key));
    chime(); buzz([30, 40, 60]);
    b.replaceWith(Object.assign(document.createElement("span"), { className: "chip up", textContent: "Climbed" }));
    toast("Next session: " + curName(e.key));
  });
  $("#fDone").onclick = () => { stopConfetti(); showLayer("finish", false); show("home"); };
  showLayer("finish", true);
  $("#finish").scrollTop = 0;
  chime(); buzz([60, 50, 60, 50, 200]);
  confetti($("#confetti"));
}

/* Lightweight canvas confetti — runs ~4s then stops. */
let confettiRaf = null;
function confetti(cv) {
  const ctx = cv.getContext("2d"), dpr = devicePixelRatio || 1;
  const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
  const colors = ["#d4ff3a", "#ff6a2b", "#f5f5f4", "#9be15d"];
  const parts = Array.from({ length: 140 }, () => ({
    x: W / 2 + (Math.random() - .5) * W * .3, y: H * .35,
    vx: (Math.random() - .5) * 16 * dpr, vy: (-Math.random() * 18 - 6) * dpr,
    s: (Math.random() * 6 + 4) * dpr, r: Math.random() * 6, vr: (Math.random() - .5) * .3,
    c: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  stopConfetti();
  (function frame(t) {
    ctx.clearRect(0, 0, W, H);
    const fade = Math.max(0, 1 - (t - t0 - 2500) / 1500);
    parts.forEach(p => {
      p.vy += .45 * dpr; p.vx *= .99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      ctx.save(); ctx.globalAlpha = fade; ctx.translate(p.x, p.y); ctx.rotate(p.r);
      ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); ctx.restore();
    });
    if (fade > 0) confettiRaf = requestAnimationFrame(frame); else ctx.clearRect(0, 0, W, H);
  })(t0);
}
function stopConfetti() { if (confettiRaf) cancelAnimationFrame(confettiRaf); confettiRaf = null; }
