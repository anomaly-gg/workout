-- One row per sync space. `id` is the secret sync code; `doc` is the merged app data (JSON);
-- `ver` increments on every write so concurrent devices can't clobber each other.
CREATE TABLE IF NOT EXISTS spaces (
  id      TEXT PRIMARY KEY,
  doc     TEXT NOT NULL DEFAULT '{}',
  ver     INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);

-- Training-day reminders: one row per device push subscription.
CREATE TABLE IF NOT EXISTS push_subs (
  endpoint  TEXT PRIMARY KEY,
  days      TEXT NOT NULL,          -- "0,2,4" (0 = Monday)
  minute    INTEGER NOT NULL,       -- local minute of day, e.g. 1080 = 18:00
  tz        TEXT NOT NULL,          -- IANA timezone, e.g. "Asia/Manila"
  sync_id   TEXT,                   -- optional: skip the reminder if a workout is already synced today
  last_sent TEXT,                   -- local date of the last reminder
  created   INTEGER NOT NULL
);
