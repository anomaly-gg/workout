/* Bottom-sheet dialogs (replace native confirm()). */
function openSheet(html, onMount) {
  $("#sheetBody").innerHTML = html;
  $("#sheet").classList.remove("hidden");
  if (onMount) onMount($("#sheetBody"));
}
function closeSheet() { $("#sheet").classList.add("hidden"); $("#sheetBody").innerHTML = ""; }

/* ask({ title, body, ok, cancel, danger }) → Promise<boolean> */
function ask({ title, body = "", ok = "OK", cancel = "Cancel", danger = false }) {
  return new Promise(resolve => {
    openSheet(`
      <h3>${esc(title)}</h3>
      ${body ? `<p>${esc(body)}</p>` : ""}
      <div class="row">
        <button class="btn" data-a="no">${esc(cancel)}</button>
        <button class="btn ${danger ? "danger" : "volt"}" data-a="yes">${esc(ok)}</button>
      </div>`, root => {
      root.querySelector('[data-a="no"]').onclick = () => { closeSheet(); resolve(false); };
      root.querySelector('[data-a="yes"]').onclick = () => { closeSheet(); resolve(true); };
    });
    $("#sheet").onclick = e => { if (e.target.id === "sheet") { closeSheet(); resolve(false); } };
  });
}
