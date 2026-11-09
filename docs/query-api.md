# Query API

The public exports are declared in [`../src/index.ts`](../src/index.ts). The
implementation of the tags is in [`../src/sqlite3.client.js`](../src/sqlite3.client.js).

## `sql`

`db.sql` is a tagged template. Every interpolated value becomes a `?` SQLite
parameter. Use it for values:

```js
await db.sql`UPDATE users SET age = ${25} WHERE name = ${'Bob'}`.run();

const row = await db.sql`SELECT * FROM users WHERE id = ${1}`.get();

const rows = await db.sql`SELECT * FROM users`.all();

const rowsAgain = await db.sql`SELECT * FROM users`.each();
```

The tag does not parse SQL or validate its grammar. It only builds the SQL
string and parameter list before sending them to the worker.

## `supersql`

`db.supersql` additionally supports raw fragments, query fragments, and arrays.
It exposes `.run()`, `.get()`, and `.all()`.

### Trusted identifiers

`raw(value)` inserts `value` directly into the SQL text. It is intended for
trusted identifiers that cannot be bound as SQL parameters:

```js
const table = 'users';
const column = 'name';
await db.supersql`SELECT ${raw(column)} FROM ${raw(table)}`.all();
```

Do not pass user-controlled identifiers to `raw()`. Validate them against an
allowlist first.

### Lists and values

`suta(array, separator = ', ')` creates a comma-separated fragment. Raw items
remain SQL text; ordinary items become bound parameters:

```js
const columns = ['name', 'age'];
const values = ['Bob', 25];

await db.supersql`
  INSERT INTO ${raw('users')} (${suta(columns.map(raw))})
  VALUES (${suta(values)})
`.run();
```

The resulting SQL is `INSERT INTO users (name, age) VALUES (?, ?)` with
parameters `['Bob', 25]`. SQLite does not support MySQL's `INSERT ... SET ...`
form.

## Database inspection

- `db.listTables()` runs a parameter-free query against `sqlite_master`.
- `db.getSchema(table)` runs `PRAGMA table_info(...)` using `raw(table)`, so the
  table name must be trusted or validated by the caller.

## Initialization and singleton behavior

`getSqlite3(databaseName, workerType)` is implemented in
[`../src/sqlite3.client.js`](../src/sqlite3.client.js). Calls with the same
database name and worker type share one client instance. Worker initialization
is lazy and begins when the first database operation is sent.
