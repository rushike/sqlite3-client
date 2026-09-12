CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    record_id INTEGER NOT NULL,
    document_code TEXT NOT NULL,
    document_type_code TEXT NOT NULL,
    document_party_code TEXT NOT NULL,
    date DATE NOT NULL,
    transaction_reference TEXT,
    transaction_method TEXT,
    description TEXT NOT NULL,
    from_account TEXT,
    to_account TEXT,
    amount REAL NOT NULL,
    closing_balance REAL,
    status TEXT DEFAULT 'NEW',
    create_ts DATETIME DEFAULT CURRENT_TIMESTAMP,
    modify_ts DATETIME,
    FOREIGN KEY (record_id) REFERENCES records(id),
    FOREIGN KEY (document_code) REFERENCES document(code),
    FOREIGN KEY (document_type_code) REFERENCES document_type(code),
    FOREIGN KEY (from_account) REFERENCES account(code),
    FOREIGN KEY (to_account) REFERENCES account(code)
);

CREATE INDEX IF NOT EXISTS idx_transactions_record_id ON transactions(record_id);
