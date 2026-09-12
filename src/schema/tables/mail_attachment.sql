CREATE TABLE IF NOT EXISTS mail_attachment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    remail_id TEXT NOT NULL,
    filename TEXT,
    mime_type TEXT,
    size INTEGER,
    uri TEXT,
    content_hash TEXT UNIQUE NOT NULL,
    FOREIGN KEY (remail_id) REFERENCES remail(id)
);