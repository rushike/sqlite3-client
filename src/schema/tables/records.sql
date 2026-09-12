CREATE TABLE IF NOT EXISTS records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_code TEXT NOT NULL,
    document_party_code TEXT NOT NULL,
    json TEXT NOT NULL,
    checksum TEXT NOT NULL UNIQUE,
    status TEXT DEFAULT 'NEW',
    create_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    modify_ts DATETIME,
    FOREIGN KEY (document_code) REFERENCES document(code)
);

CREATE INDEX IF NOT EXISTS idx_records_checksum ON records(checksum);
