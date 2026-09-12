CREATE TABLE IF NOT EXISTS document (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    uri TEXT,
    filename TEXT,
    status TEXT DEFAULT 'CREATED',
    document_type_code TEXT NOT NULL,
    party_code TEXT,
    source TEXT,
    source_id TEXT,
    errmsg TEXT,
    document_date DATETIME,
    password TEXT,
    create_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    modify_ts DATETIME,
    UNIQUE(source, source_id),
    FOREIGN KEY (document_type_code) REFERENCES document_type(code)
);
