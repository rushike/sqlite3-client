# Architecture

The client is split between the main thread and a SQLite worker.

1. [`src/sqlite3.client.js`](../src/sqlite3.client.js) creates a client,
   converts tagged templates into SQL plus parameters, and tracks request
   promises.
2. [`src/sqlite3.worker.js`](../src/sqlite3.worker.js) handles dedicated-worker
   requests.
3. [`src/sqlite3.sharedworker.js`](../src/sqlite3.sharedworker.js) handles the
   shared-worker mode.
4. [`src/sqlite3.localworker.js`](../src/sqlite3.localworker.js) provides the
   local/testing fallback.
5. [`src/wa-sqlite.js`](../src/wa-sqlite.js) initializes the WASM SQLite runtime
   and registers the OPFS VFS.
6. [`src/utils.js`](../src/utils.js) executes statements and converts rows to
   JavaScript objects.

The synchronous OPFS access handle is used from a worker because it cannot be
used on the browser main thread. The shared worker is useful when multiple tabs
of the same origin need to use the same database name.

## Cross-origin isolation

For OPFS cooperative synchronization and `SharedArrayBuffer`, the application
should send:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The local mode is a compatibility/testing fallback and should not be treated as
the production persistence architecture.
