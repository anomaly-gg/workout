/* Boot + global wiring. */
$$("#nav button").forEach(b => b.addEventListener("click", () => show(b.dataset.screen)));
$("#vidClose").addEventListener("click", closeVideo);
$("#vidOverlay").addEventListener("click", e => { if (e.target.id === "vidOverlay") closeVideo(); });
document.addEventListener("keydown", e => {
  if (e.key !== "Escape") return;
  if (!$("#vidOverlay").classList.contains("hidden")) closeVideo();
  else if (!$("#sheet").classList.contains("hidden")) $("#sheet").click();
});
document.addEventListener("pointerdown", unlockAudio, { once: true });

show("home");
if (session) openSession();   // resume a workout interrupted by refresh / closed tab
startSync();
