# Troubleshooting

## `getSqlite3` is not exported

Use a current package build whose entrypoint is
[`src/index.ts`](../src/index.ts), where `getSqlite3` is exported. If using the
unscoped import name, install the npm alias described in
[`../README.md`](../README.md).

## Worker initialization fails

Check the browser's cross-origin isolation headers and confirm that the worker
assets are emitted by Vite. The worker entrypoints are
[`src/sqlite3.worker.js`](../src/sqlite3.worker.js) and
[`src/sqlite3.sharedworker.js`](../src/sqlite3.sharedworker.js).

## SQL syntax errors

Inspect the generated `fragment.sql` and `fragment.params` values from
[`supersql`](../src/sqlite3.client.js). Use `raw()` only for trusted identifiers
and ordinary interpolation for data values. SQLite uses
`INSERT INTO table (columns) VALUES (...)`, not MySQL's `INSERT ... SET ...`.

## Schema setup

The client intentionally does not run migrations. Create application tables
with ordinary SQL or an application-owned migration layer before querying them.
