import { initSqlite3 } from "./wa-sqlite.js"
import { SQLiteRunner } from "./utils.js"

console.log("Shared Worker running:", import.meta.url);

let sqlite3, db;
let sqliteRunner;

const connections = new Set();

// Catch *runtime errors* (syntax errors, throw outside async, etc)
self.addEventListener("error", (e) => {
  console.error("Worker runtime error:", e);
  for (const port of connections) {
    port.postMessage({ reqId: -1, fatal: true, error: e.message || "Unknown worker error" });
  }
});

// Catch *unhandled Promise rejections*
self.addEventListener("unhandledrejection", (e) => {
  console.error("Worker unhandled rejection:", e.reason);
  for (const port of connections) {
    port.postMessage({ reqId: -1, fatal: true, error: e.reason?.message || String(e.reason) });
  }
});

self.addEventListener("connect", (e) => {
  const port = e.ports[0];
  connections.add(port);

  port.addEventListener("message", async (msgEvent) => {
    try {
      const { reqId, type, sql, params, uri } = msgEvent.data;
      if (type === "init") {
        if (!sqlite3 || !db) {
          [sqlite3, db] = await initSqlite3(uri, true); // true = isShared
          sqliteRunner = new SQLiteRunner(sqlite3, db);
        }
        return port.postMessage({ reqId, result: "ok" });
      }

      if (!sqlite3 || !db || !sqliteRunner) {
        throw new Error("Database not initialized. Call init() first.");
      }

      if (type === "each") {
        const rows = [];
        await sqliteRunner.sqlExecEach(sql, params, rows.push.bind(rows));
        return port.postMessage({ reqId, result: rows });
      }

      const result = await sqliteRunner.sqlExec(type, sql, params);
      port.postMessage({ reqId, result });
    } catch (err) {
      console.error("Shared Worker caught error:", err);
      port.postMessage({ reqId: msgEvent.data["reqId"] || -1, error: err.message, stack: err.stack });
    }
  });

  port.start();
});
