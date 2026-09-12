-- DAG (Directed Acyclic Graph) definition table.
-- Stores workflow blueprints; each row is a named, reusable DAG.
-- Actual execution records live in the `task` table and are linked via trace_id.
--
-- Column notes
-- ─────────────
-- global_args   JSON Record<string,any>  – default args merged into every node at dispatch time
-- nodes         JSON DagNodeDef[]        – [{ task_name, children: string[], default_args: {} }]
-- from_ts       Unix ms – DAG is triggerable only after this timestamp (NULL = no lower bound)
-- till_ts       Unix ms – DAG expires after this timestamp (NULL = never expires)
-- trigger_type  MANUAL | CRON | EVENT
-- on_failure    FAIL_FAST | CONTINUE | RETRY_LEAF
-- max_concurrent 0 = unlimited concurrent runs of this DAG
-- version       Incremented on each logical update; lets you trace which version a run used
-- tags          JSON string[] – free-form labels for filtering / grouping

CREATE TABLE IF NOT EXISTS task_dag (

    -- IDENTIFICATION
    id          TEXT    PRIMARY KEY NOT NULL,           -- UUID (uuidv7)
    dag_name    TEXT    NOT NULL UNIQUE,         -- Stable human-readable key used at runtime
    description TEXT,

    -- DEFINITION (serialised as JSON)
    global_args TEXT    NOT NULL DEFAULT '{}',          -- JSON Record<string, any>
    nodes       TEXT    NOT NULL DEFAULT '[]',          -- JSON DagNodeDef[]

    -- Content fingerprint — md5(stableStringify({ global_args, nodes, on_failure, trigger_type, max_concurrent }))
    -- addDag() compares this hash to detect whether the definition actually changed.
    hash        TEXT    NOT NULL DEFAULT '',

    -- LIFETIME
    status      TEXT    NOT NULL DEFAULT 'ACTIVE',      -- 'ACTIVE' | 'INACTIVE'
    from_ts     INTEGER,                                -- Unix ms, NULL = no lower bound
    till_ts     INTEGER,                                -- Unix ms, NULL = never expires

    -- EXECUTION POLICIES
    trigger_type    TEXT    NOT NULL DEFAULT 'MANUAL',       -- 'MANUAL' | 'CRON' | 'EVENT'
    on_failure      TEXT    NOT NULL DEFAULT 'FAIL_FAST',    -- 'FAIL_FAST' | 'CONTINUE' | 'RETRY_LEAF'
    max_concurrent  INTEGER NOT NULL DEFAULT 0,              -- 0 = unlimited

    -- VERSIONING & AUDIT
    version             INTEGER NOT NULL DEFAULT 1,
    tags                TEXT,                           -- JSON string[]
    created_at          INTEGER NOT NULL,               -- Unix ms
    updated_at          INTEGER NOT NULL,               -- Unix ms
    created_by          TEXT,
    last_triggered_at   INTEGER                         -- Denormalised; updated on each trigger

);

-- Fast lookup by name (most common access pattern)
-- CREATE INDEX IF NOT EXISTS idx_task_dag_name   ON task_dag (dag_name, version);

-- Queries for active + within-window DAGs (used by orchestrator loadDags())
CREATE INDEX IF NOT EXISTS idx_task_dag_status        ON task_dag (status);
CREATE INDEX IF NOT EXISTS idx_task_dag_window        ON task_dag (status, from_ts, till_ts);

-- Enables O(1) "has definition changed?" check without reading large JSON columns
CREATE UNIQUE INDEX IF NOT EXISTS idx_task_dag_hash          ON task_dag (dag_name, hash);
