/* "The science" sheet: each principle, what the research found, how this app applies it, and the source. */
function openScience() {
  openSheet(`
    <h3>The science</h3>
    <p>Why the plan looks the way it does. Every point links to its source.</p>
    <div class="sci-list">
      ${SCIENCE.map((s, i) => `
        <article class="sci">
          <div class="sci-n display">${String(i + 1).padStart(2, "0")}</div>
          <div class="sci-body">
            <h4>${esc(s.title)}</h4>
            <p class="sci-find">${esc(s.finding)}</p>
            <div class="sci-app"><span class="eyebrow">In this app</span>${esc(s.app)}</div>
            <a class="sci-src" href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.src)} &#8599;</a>
          </div>
        </article>`).join("")}
    </div>
    <div class="sci-caveat">${esc(SCIENCE_CAVEAT)}</div>
    <button class="btn block" style="margin-top:18px" id="sciDone">Got it</button>
  `, root => { root.querySelector("#sciDone").onclick = closeSheet; });
  $("#sheet").onclick = e => { if (e.target.id === "sheet") closeSheet(); };
}
