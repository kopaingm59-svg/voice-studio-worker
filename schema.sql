CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  username TEXT,
  credits INTEGER DEFAULT 0,
  is_admin INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_users_updated_at ON users (updated_at);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);
