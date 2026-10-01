# Calisthenics

Personal bodyweight training app: variation-ladder progression, an equipment-based plan generator,
a workout player with rest/hold timers, and science-backed planning (sources in-app under "The science").

**Live:** https://anomaly-gg.github.io/workout/ — install it from the browser menu (or Settings → Install app).

Plain HTML/CSS/JS, no build step. Data stays in the browser (localStorage); use Settings → Export/Import to move it.

- Local: `Start Workout App.bat` (serves on http://localhost:8753)
- Tests: `node _dev/test_planner.js`
- Deploy: `python _dev/deploy.py "message"`
