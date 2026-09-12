CREATE TABLE IF NOT EXISTS response (
    id TEXT PRIMARY KEY,
    status_code INTEGER,
    headers JSON,
    body JSON,
    uri TEXT,
    create_ts DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cached_until DATETIME
);