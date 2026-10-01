/* Home: state-aware headline, next-workout hero, week ring, streak/rank, level-ups, ladders. */

function headline() {
  const d = daysSinceLast(), c = sessionsInWeek(Date.now()), g = settings.weeklyGoal;
  if (d === null) return ["Day one.", "Every ladder starts at the first rung. Let's put you on it."];
  if (d === 0) return ["Done today.", "Strength gets built while you recover. Next session, you climb again."];
  if (c >= g) return ["Week won.", `${c}/${g} sessions in. Anything extra this week is a bonus.`];
  if (d === 1) return ["Rest or go.", "You trained yesterday — full-body works best with a day between. Fresh? Go."];
  if (d <= 3) return ["You're recovered.", `${d} days since your last session. Time to climb.`];
  return [`${d} days off.`, "Momentum fades fast. Even a short session keeps the streak alive."];
}

function renderHome() {
  const w = nextWorkout(), other = w === "A" ? "B" : "A";
  const plan = PLAN[w], [h1, h2] = headline();
  const sets = plan.exercises.reduce((s, e) => s + e.sets, 0);
  const rk = rank(), st = weekStreak(), ready = readyToLevel();
  const weekCount = sessionsInWeek(Date.now()), goal = settings.weeklyGoal;
  const today = startOfDay(Date.now()), wk = startOfWeek(Date.now());

  const resume = session && $("#session").classList.contains("hidden") ? `
    <div class="resume">
      <div><div class="eyebrow">In progress</div><b>Workout ${session.workout}</b> · ${fmtMins(Date.now() - session.started)} in</div>
      <button class="btn volt" id="resumeBtn">Resume</button>
    </div>` : "";

  $("#home").innerHTML = `
    <div class="home-top">
      <div class="eyebrow">${new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
      <button class="icon-btn" id="settingsBtn" aria-label="Settings">${ICON.gear}</button>
    </div>
    <h1 class="display home-h1">${esc(h1)}</h1>
    <p class="home-sub">${esc(h2)}${ready.length ? ` <b class="volt-txt">${ready.length} level-up${ready.length > 1 ? "s" : ""} waiting.</b>` : ""}</p>
    ${resume}
    ${!settings.profile ? `
      <button class="eq-onboard" id="svOnboard">${ICON.bolt}
        <div><b>Personalise your plan</b><span>1-minute survey: goal, equipment, a quick strength check, and calorie &amp; protein targets.</span></div>
        ${ICON.arrow}</button>` : ""}

    <section class="hero ${w}">
      ${heroPhotoHtml(w)}
      <div class="hero-shade"></div>
      <div class="hero-letter display" aria-hidden="true">${w}</div>
      <div class="hero-body">
        <div class="eyebrow hero-eyebrow">Next up · Session ${history.length + 1}</div>
        <div class="display hero-title">Workout ${w}</div>
        <div class="hero-meta"><span>${plan.exercises.length} moves</span><span>${sets} sets</span><span>~${estMinutes(w)} min</span></div>
        <ol class="hero-moves">
          ${plan.exercises.map((e, i) => `
            <li><span class="n">${String(i + 1).padStart(2, "0")}</span><span class="nm">${esc(curName(e.key))}</span>${pipsHtml(e.key, w)}</li>`).join("")}
        </ol>
        <button class="btn-go ${w === "B" ? "fire" : ""}" id="startBtn">Start workout ${ICON.arrow}</button>
      </div>
    </section>
    <button class="swap-link" id="swapBtn">or do Workout ${other} instead</button>

    <div class="week card">
      ${ringSvg(weekCount / goal, 92, 8, weekCount >= goal ? "var(--fire)" : "var(--volt)",
        `<div class="display ring-n">${weekCount}<small>/${goal}</small></div><div class="ring-l">this week</div>`)}
      <div class="week-right">
        <div class="days">
          ${[0, 1, 2, 3, 4, 5, 6].map(i => {
            const d = addDays(wk, i), done = trainedOn(d);
            return `<div class="day ${done ? "done" : ""} ${d === today ? "today" : ""} ${d > today ? "future" : ""}">
              <span>${"MTWTFSS"[i]}</span><i>${done ? ICON.check : ""}</i></div>`;
          }).join("")}
        </div>
        <div class="week-note">${weekCount >= goal ? "Goal hit — streak secured this week." : `${goal - weekCount} more to hit your weekly goal.`}</div>
      </div>
    </div>

    ${fuelTileHtml()}
    <div class="tiles">
      <div class="tile fire-t">
        <div class="t-ico">${ICON.fire}</div>
        <div class="display t-n">${st.current}</div>
        <div class="t-l">week streak</div>
      </div>
      <div class="tile rank-t">
        <div class="t-ico">${ICON.bolt}</div>
        <div class="display t-n">LV ${rk.level}</div>
        <div class="t-l">${rk.title}</div>
        <div class="meter"><i style="width:${rk.pct * 100}%"></i></div>
        <div class="t-s">${rk.next ? `${rk.toNext} rung${rk.toNext === 1 ? "" : "s"} to ${rk.next}` : "Max rank"}</div>
      </div>
      <div class="tile">
        <div class="t-ico">${ICON.trophy}</div>
        <div class="display t-n">${history.length}</div>
        <div class="t-l">sessions</div>
      </div>
    </div>

    ${ready.length ? `
      <div class="section-title"><h2>Level up</h2><span class="link">earned it</span></div>
      <div class="stack">${ready.map(e => `
        <div class="lvlup">
          <div class="lvlup-txt">
            <div class="eyebrow">${esc(e.cat)}</div>
            <div class="from">${esc(curName(e.key))}</div>
            <div class="to">${ICON.arrow}<span>${esc(e.levels[nextRung(e.key)])}</span></div>
          </div>
          <button class="btn volt" data-lvlup="${e.key}">${ICON.up} Climb</button>
        </div>`).join("")}</div>` : ""}

    <div class="section-title"><h2>Your ladders</h2><span class="link" data-go="skills">All skills</span></div>
    <div class="ladders">
      ${ALL_EX.map(e => `
        <button class="ladder" data-ladder="${e.key}">
          ${photoHtml(curName(e.key), e.workout)}
          <div class="ladder-body">
            <div class="ladder-rung display">${lvlOf(e.key) + 1}<small>/${e.levels.length}</small></div>
            <div class="ladder-nm">${esc(curName(e.key))}</div>
            ${pipsHtml(e.key, e.workout)}
          </div>
        </button>`).join("")}
    </div>

    <details class="card warm">
      <summary><span class="display">Warm-up</span><span class="muted">3–5 min · every session</span></summary>
      <ul>
        <li>Wrist circles + arm circles</li>
        <li>10 scapular pulls (dead hang, shrug down &amp; up)</li>
        <li>10 scapular push-ups</li>
        <li>10 bodyweight squats</li>
        <li>A couple of easy reps of your first move</li>
      </ul>
    </details>
    <button class="sci-card" id="sciBtn">
      <div>
        <div class="eyebrow">Why this works</div>
        <div class="display">The science</div>
        <div class="sci-card-sub">${SCIENCE.length} research-backed principles behind your plan</div>
      </div>
      ${ICON.arrow}
    </button>
  `;

  saveReminderText();
  $("#startBtn").onclick = () => startWorkout(w);
  $("#swapBtn").onclick = () => startWorkout(other);
  $("#settingsBtn").onclick = openSettings;
  $("#sciBtn").onclick = openScience;
  if ($("#svOnboard")) $("#svOnboard").onclick = openSurvey;
  if ($("#fuelBtn")) $("#fuelBtn").onclick = openFuel;
  if ($("#resumeBtn")) $("#resumeBtn").onclick = () => openSession();
  $$("[data-lvlup]").forEach(b => b.onclick = () => {
    const e = exDef(b.dataset.lvlup);
    setLevel(e.key, nextRung(e.key));
    chime(); buzz([30, 40, 60]);
    toast("Level up! Now: " + curName(e.key));
    renderHome();
  });
  $$("[data-ladder]").forEach(b => b.onclick = () => { show("skills"); focusSkill(b.dataset.ladder); });
  $$("[data-go]").forEach(b => b.onclick = () => show(b.dataset.go));
}
