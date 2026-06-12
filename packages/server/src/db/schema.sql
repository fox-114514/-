-- CloudAsset SQLite schema
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS assets (
  id            TEXT PRIMARY KEY,
  name          TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type     TEXT NOT NULL,
  size_bytes    INTEGER NOT NULL,
  storage_path  TEXT NOT NULL,
  category      TEXT NOT NULL DEFAULT 'other',
  description   TEXT,
  content_hash  TEXT,
  uploaded_at   INTEGER NOT NULL,
  updated_at    INTEGER NOT NULL,
  share_token   TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_assets_category ON assets(category);
CREATE INDEX IF NOT EXISTS idx_assets_uploaded ON assets(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_assets_name     ON assets(name);

CREATE TABLE IF NOT EXISTS tags (
  id    INTEGER PRIMARY KEY AUTOINCREMENT,
  name  TEXT UNIQUE NOT NULL
);

CREATE TABLE IF NOT EXISTS asset_tags (
  asset_id TEXT NOT NULL,
  tag_id   INTEGER NOT NULL,
  PRIMARY KEY (asset_id, tag_id),
  FOREIGN KEY (asset_id) REFERENCES assets(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id)   REFERENCES tags(id)    ON DELETE CASCADE
);
