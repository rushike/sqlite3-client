CREATE TABLE IF NOT EXISTS http_call (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    
    url TEXT NOT NULL,
    method TEXT NOT NULL, -- GET, POST, PUT, DELETE
    request_headers TEXT,

    -- raw, form-multipart, file-binary, no-body
    request_type TEXT,
    
    -- if raw - Stores JSON, TEXT etc directly
    -- if form-multipart -> Stores JSON Array of form mutli-part
    -- if file-binary -> Store opfs file uri
    -- else null
    request_body TEXT,
    

    status_code INTEGER, 
    response_headers TEXT,
    
    -- json. text, binary
    response_type TEXT,

    -- if json store directly
    -- else store opfs path
    response_body TEXT,

    duration_ms INTEGER, -- Total time elapsed
    
    error_message TEXT,  -- Stack trace or "Timeout" string
    error_trace TEXT,
    ip_address TEXT,     -- Useful for debugging connectivity
    
    -- Timing
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
