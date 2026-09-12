CREATE TABLE IF NOT EXISTS secrets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,

  source TEXT NOT NULL,
  source_id TEXT NOT NULL,
  version INTEGER NOT NULL,
  secret_type TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,

  valid_from_date DATETIME NOT NULL DEFAULT '1900-01-01T00:00:00Z',
  valid_to_date DATETIME DEFAULT NULL,

  password TEXT,

  create_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  modify_ts DATETIME,

  -- Ensure valid date range
  CHECK (
    valid_to_date IS NULL
    OR valid_to_date > valid_from_date
  ),

  -- Prevent duplicate versions for same secret
  UNIQUE (
    source,
    source_id,
    version,
    secret_type,
    key
  )
);