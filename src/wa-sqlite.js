import SQLiteESMFactory from 'wa-sqlite/dist/wa-sqlite.mjs';
import { OPFSCoopSyncVFS } from 'wa-sqlite/src/examples/OPFSCoopSyncVFS.js';

// Import the Javascript API wrappers.
import * as SQLite from 'wa-sqlite';

let db = null;

async function initWaSqlite() {
  // Invoke the ES6 module factory to create the SQLite
  // Emscripten module. This will fetch and compile the
  // .wasm file.
  const module = await SQLiteESMFactory();

  // Use the module to build the API instance.
  globalThis.sqlite3 = SQLite.Factory(module);
  // 3. Create the COOP (Cooperative OPFS) VFS
  const coopVfs = await OPFSCoopSyncVFS.create("coop", module);

  // 4. Register VFS with sqlite3 runtime
  globalThis.sqlite3.vfs_register(coopVfs, true); // true = make default VFS
}


export async function initSqlite3(dbName = "myfinsheet-client1") {
  if (!globalThis.sqlite3) {
    await initWaSqlite();
  }

  if (!db) {
    db = await globalThis.sqlite3.open_v2(`${dbName}`);
  }

  return [globalThis.sqlite3, db];
}
