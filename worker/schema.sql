-- One row per sync space. `id` is the secret sync code; `doc` is the merged app data (JSON);
-- `ver` increments on every write so concurrent devices can't clobber each other.
CREATE TABLE IF NOT EXISTS spaces (
  id      TEXT PRIMARY KEY,
  doc     TEXT NOT NULL DEFAULT '{}',
  ver     INTEGER NOT NULL DEFAULT 0,
  created INTEGER NOT NULL,
  updated INTEGER NOT NULL
);
