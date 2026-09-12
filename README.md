# sqlite3-client

`sqlite3-client` is a robust, asynchronous SQLite client designed for the browser environment. It leverages **wa-sqlite** (a WebAssembly build of SQLite) and the **Origin Private File System (OPFS)** to provide high-performance, persistent local database storage.

## How it Uses wa-sqlite and OPFS

The client initializes a WebAssembly SQLite runtime using the ES6 module factory from `wa-sqlite`. To achieve high performance and persistence, it mounts an **OPFS VFS** (specifically, `OPFSCoopSyncVFS` for Cooperative OPFS). This VFS translates SQLite's synchronous C file I/O operations into synchronous filesystem calls provided by the browser's Origin Private File System. Because synchronous OPFS API calls (`createSyncAccessHandle`) are only available in Web Workers, the database engine strictly runs inside a background worker.

### Required HTTP Headers

Because `wa-sqlite` uses `SharedArrayBuffer` for synchronization and memory sharing (specifically needed for `OPFSCoopSyncVFS`), your web server **must** serve the application with strict Cross-Origin Isolation headers. Without these headers, `SharedArrayBuffer` is disabled in modern browsers, and the SQLite client will fail to initialize.

Ensure the following headers are set on your server:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

---

## Client API Details

The API provides a convenient, promise-based interface to interact with the database from the main thread.

### Initialization

```javascript
import { getSqlite3 } from 'sqlite3-client';

// Get a singleton instance of the client
// workerType can be: "local", "shared", or null (standard Worker)
const db = await getSqlite3("my-database-name", "shared");
```

### Methods

- **`init()`**: (Lazy) Initializes the worker and the database connection.
- **`applyMigrations()`**: Triggers the migration process defined in the worker.
- **`listTables()`**: Returns a list of all tables in the current database.
- **`getSchema(table)`**: Returns the PRAGMA table information for a given table name.

### Querying

The client uses Tagged Template Literals to write safe, parameter-bound SQL queries.

#### The `sql` Tag
Use the `sql` tag for standard prepared statements. It automatically extracts parameters to prevent SQL injection.

```javascript
// Run a query that doesn't return data (e.g., INSERT, UPDATE)
await db.sql`INSERT INTO users (name, age) VALUES (${"Alice"}, ${30})`.run();

// Fetch a single row
const user = await db.sql`SELECT * FROM users WHERE id = ${1}`.get();

// Fetch all matching rows
const users = await db.sql`SELECT * FROM users WHERE age > ${20}`.all();
```

#### The `supersql` Tag (Dynamic Queries)
The `supersql` tag extends the basic `sql` tag by supporting dynamic query construction using helper functions.

- `raw(value)`: Injects raw SQL identifiers (like table or column names) securely.
- `suta(array, separator)`: Joins an array of values or fragments.

```javascript
import { raw, suta } from 'sqlite3-client';

const tableName = "users";
const columns = ["name", "age"];
const values = ["Bob", 25];

await db.supersql`
  INSERT INTO ${raw(tableName)} (${suta(columns.map(raw))}) 
  VALUES (${suta(values)})
`.run();
```

---

## Architecture: How Queries Run

To ensure the main UI thread remains responsive, all database operations are offloaded to background workers. Here is the architectural flow of a query:

1. **The Client (Main Thread)**:
   When you execute a query via `db.sql\`...\``, the `SQLiteClient` parses the template literal. It separates the SQL string (with `?` placeholders) and the parameter values.
   
2. **IPC (Inter-Process Communication)**:
   The client creates a unique `reqId` and stores the associated Promise (`resolve`/`reject` callbacks). It then packages the query, parameters, and `reqId` into a payload and sends it to the worker via `postMessage`.

3. **The Worker**:
   The worker (`sqlite3.worker.js` or `sqlite3.sharedworker.js`) listens for incoming messages. 
   - When it receives a query, it passes the SQL string and parameters to the `SQLiteRunner`.
   - The runner executes the query synchronously against the WASM-backed SQLite database using the OPFS VFS.
   - Using a worker is required because the OPFS synchronous API (`createSyncAccessHandle`) blocks the thread it runs on, which is illegal on the main thread.

4. **Result Delivery**:
   Once the query completes (or errors), the worker packages the result (or error message) with the corresponding `reqId` and uses `postMessage` to send it back to the main thread.

5. **Promise Resolution**:
   The main thread receives the message, looks up the pending Promise using the `reqId`, and resolves (or rejects) it with the payload from the worker.

### Worker Types
- **Standard Worker (default)**: A dedicated `Worker` spawned for the current browser tab.
- **SharedWorker (`"shared"`)**: Uses a `SharedWorker`, allowing multiple browser tabs of the same origin to communicate with a single shared SQLite database instance. This prevents database lock conflicts across tabs.
- **Local Worker (`"local"`)**: Bypasses Web Workers (runs on the main thread) primarily for testing environments where Workers or OPFS might not be available.
