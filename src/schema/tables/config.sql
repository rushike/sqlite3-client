CREATE TABLE IF NOT EXISTS config (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    source_id TEXT NOT NULL,
    key TEXT NOT NULL,
    value TEXT, -- Stored as JSON string
    config_version TEXT DEFAULT '1',
    valid_from_date DATETIME DEFAULT '1970-01-01 00:00:00',
    valid_to_date DATETIME,
    create_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    modify_ts DATETIME
);
