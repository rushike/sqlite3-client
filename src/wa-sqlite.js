// Import the Javascript API wrappers statically.
import * as SQLite from 'wa-sqlite';

let db = null;

async function initWaSqlite(isShared) {
  // Always use the Synchronous build + OPFSCoopSyncVFS. 
  // It is the ONLY VFS that supports multiple connections without Asyncify crashes!
  const SQLiteESMFactory = (await import('wa-sqlite/dist/wa-sqlite.mjs')).default;
  const module = await SQLiteESMFactory();
  globalThis.sqlite3 = SQLite.Factory(module);
  
  const { OPFSCoopSyncVFS } = await import('wa-sqlite/src/examples/OPFSCoopSyncVFS.js');
  const vfs = await OPFSCoopSyncVFS.create("coop", module);

  // Register VFS with sqlite3 runtime
  globalThis.sqlite3.vfs_register(vfs, true); // true = make default VFS
}

export async function initSqlite3(dbName = "myfinsheet-client1", isShared = false) {
  if (!globalThis.sqlite3) {
    await initWaSqlite(isShared);
  }

  if (!db) {
    db = await globalThis.sqlite3.open_v2(`${dbName}`);
  }

  return [globalThis.sqlite3, db];
}
