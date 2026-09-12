CREATE TABLE IF NOT EXISTS remail (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_email TEXT,
    subject TEXT,
    text TEXT,
    uri TEXT,
    content_hash TEXT UNIQUE NOT NULL,
    create_ts DATETIME,
    modify_ts DATETIME
);