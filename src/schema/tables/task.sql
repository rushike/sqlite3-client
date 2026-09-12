-- Individual task execution record.
-- One row per node execution within any workflow (standalone or DAG-triggered).
-- DAG runs are grouped by trace_id; graph structure is captured in parents / children.
--
-- Column notes
-- ─────────────
-- task_name     References a handler registered in TaskRegistry (not a FK — registry is in-memory)
-- namespace     Logical grouping; equals dag_name for orchestrated tasks, 'default' otherwise
-- parents       JSON string[]  – UUIDs of TaskRecords that must complete before this one starts
-- children      JSON string[]  – UUIDs of TaskRecords that this one unblocks (backfilled on completion)
-- depth         0 for root nodes; incremented per graph level
-- input_args    JSON any[]     – merged args passed to the handler
-- output_result JSON           – value returned by the handler (null on failure)
-- trace_id      Links all task rows belonging to a single DAG run together
-- server_ref    External/backend task ID for cross-system correlation

CREATE TABLE IF NOT EXISTS task (

    -- IDENTIFICATION
    id          TEXT    PRIMARY KEY NOT NULL,           -- UUID (uuidv7)
    task_name   TEXT    NOT NULL,                       -- Key into in-memory TaskRegistry

    -- DAG / GRAPH LOGIC
    namespace   TEXT    NOT NULL DEFAULT 'default',
    parents     TEXT    NOT NULL DEFAULT '[]',          -- JSON string[] of task UUIDs
    children    TEXT    NOT NULL DEFAULT '[]',          -- JSON string[] of task UUIDs (backfilled)
    depth       INTEGER NOT NULL DEFAULT 0,

    -- STATE
    status      TEXT    NOT NULL,                       -- See TaskLifeCycle constants

    -- DATA FLOW
    input_args    TEXT,                                 -- JSON any[] – args passed to handler
    output_result TEXT,                                 -- JSON – handler return value

    -- PERFORMANCE & METRICS
    created_at  INTEGER NOT NULL,                       -- Unix ms
    started_at  INTEGER,                                -- Unix ms – set when handler begins
    finished_at INTEGER,                                -- Unix ms – set when handler resolves/rejects

    -- ERROR DETAIL
    error_details TEXT,                                 -- Message + stack trace on failure

    -- TRACING & EXTERNAL
    trace_id    TEXT,                                   -- Groups all nodes of one DAG run
    run_args    TEXT,                                   -- JSON string – snapshot of dynamic DAG globals at this step
    server_ref  TEXT,                                   -- Backend / remote task reference
    retry_count INTEGER NOT NULL DEFAULT 0


);

-- Most common access patterns
CREATE INDEX IF NOT EXISTS idx_task_status       ON task (status);
CREATE INDEX IF NOT EXISTS idx_task_trace        ON task (trace_id);
-- CREATE INDEX IF NOT EXISTS idx_task_name_status  ON task (task_name, status);
CREATE INDEX IF NOT EXISTS idx_task_namespace    ON task (namespace);