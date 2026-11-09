# sqlite3-client

Browser SQLite client built on `wa-sqlite`, Web Workers, and OPFS.

`wa-sqlite` is installed as a runtime dependency from the public Git repository.
Its JavaScript factory and WASM remain in
`node_modules/wa-sqlite/dist/`; this package does not download or copy the WASM
into its own `dist` directory.

## Installation and imports

Install directly from the Git repository:

```bash
npm install github:rushike/sqlite3-client
```

Use the package entrypoint:

```js
import { getSqlite3, raw, suta } from 'sqlite3-client';

const db = await getSqlite3('my-database-name', 'shared');
```

`getSqlite3` is exported from [`src/index.ts`](./src/index.ts) and returns a
singleton for each `databaseName + workerType` pair. The available worker types
are `null` (dedicated Worker), `'shared'` (SharedWorker), and `'local'` (main
thread fallback, primarily for tests).

The package name in [`package.json`](./package.json) is intentionally unscoped,
so the unscoped import is the primary supported form for Git installation.

<details>
<summary>Scoped package import (not the current Git-install path)</summary>

The current package is not published under the scoped name. If a future
registry package is published as `@rushike/sqlite3-client`, its import would be:

```js
import { getSqlite3 } from '@rushike/sqlite3-client';
```

</details>

## Browser requirements

The default and shared worker modes use the OPFS VFS. Serve the application
with cross-origin isolation headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

The implementation details are documented in [`docs/architecture.md`](./docs/architecture.md).

The Vite library build leaves `wa-sqlite` external. The consuming Vite
application must process the dependency so that `wa-sqlite.wasm` is emitted in
the application's final asset directory. See
[`docs/consideration.md`](./docs/consideration.md) for bundler and deployment
requirements.

## Querying

The `sql` tag binds interpolated values as SQLite parameters:

```js
await db.sql`INSERT INTO users (name, age) VALUES (${'Alice'}, ${30})`.run();
const user = await db.sql`SELECT * FROM users WHERE id = ${1}`.get();
const users = await db.sql`SELECT * FROM users WHERE age > ${20}`.all();
```

For dynamic identifiers and lists, use `supersql`:

```js
const tableName = 'users';
const columns = ['name', 'age'];
const values = ['Bob', 25];

await db.supersql`
  INSERT INTO ${raw(tableName)} (${suta(columns.map(raw))})
  VALUES (${suta(values)})
`.run();
```

This generates SQLite-compatible SQL equivalent to:

```sql
INSERT INTO users (name, age) VALUES (?, ?)
```

`INSERT ... SET ...` is not SQLite syntax; it is associated with MySQL.

`raw()` inserts text directly into the SQL string. It does not escape or
validate identifiers, so only pass trusted table and column names. Values that
come from users or external input must use normal interpolation or `suta()` so
they remain bound parameters.

See [`docs/query-api.md`](./docs/query-api.md) for the complete query-builder
behavior and result methods.

## Public API

- `getSqlite3(databaseName?, workerType?)`
- `SQLiteClient`
- `raw(value)`
- `suta(values, separator?)`
- `db.init()`
- `db.listTables()`
- `db.getSchema(table)`
- `db.sql\`...\`.run()`, `.get()`, `.all()`, `.each()`
- `db.supersql\`...\`.run()`, `.get()`, `.all()`

The package no longer exposes or runs a migration feature. Schema creation and
migrations should be owned by the application using ordinary SQL or its own
migration layer.

## Detailed documentation

- [`docs/query-api.md`](./docs/query-api.md) — tags, parameters, raw identifiers, arrays, and results.
- [`docs/architecture.md`](./docs/architecture.md) — client, worker, WASM, OPFS, and SharedWorker flow.
- [`docs/build-and-deployment.md`](./docs/build-and-deployment.md) — Vite, package metadata, `@rushike/myfs`, and publishing.
- [`docs/consideration.md`](./docs/consideration.md) — WASM ownership, bundler requirements, and deployment checks.
- [`docs/troubleshooting.md`](./docs/troubleshooting.md) — common browser, worker, and package-resolution failures.
