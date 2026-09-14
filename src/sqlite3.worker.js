import { initSqlite3 } from "./wa-sqlite.js"
import { SQLiteRunner } from "./utils.js"
import { applyFullSchema } from "./migrations.js";



console.log("Worker running:", import.meta.url);

let sqlite3, db;

let sqliteRunner;

// Catch *runtime errors* (syntax errors, throw outside async, etc)
self.addEventListener("error", (e) => {
  console.error("Worker runtime error:", e);

  self.postMessage({
    reqId: -1,
    fatal: true,
    error: e.message || "Unknown worker error"
  });
});

// Catch *unhandled Promise rejections*
self.addEventListener("unhandledrejection", (e) => {
  console.error("Worker unhandled rejection:", e.reason);

  self.postMessage({
    reqId: -1,
    fatal: true,
    error: e.reason?.message || String(e.reason)
  });
});

self.onmessage = async (e) => {

  try {
    const { reqId, type, sql, params, uri } = e.data;
    if (type === "init") {
      [sqlite3, db] = await initSqlite3(uri);
      sqliteRunner = new SQLiteRunner(sqlite3, db);
      return postMessage({ reqId, result: "ok" });
    }



    if (!sqlite3 || !db || !sqliteRunner) {
      throw new Error("Database not initialized. Call init() first.");
    }


    if (type === "migrations") {
      await applyFullSchema(sqliteRunner)
      return postMessage({ reqId, result: "migrations-ok" });
    }

    if (type === "each") {
      const rows = [];
      await sqliteRunner.sqlExecEach(sql, params, rows.push.bind(rows));
      return postMessage({ reqId, result: rows });
    }


    const result = await sqliteRunner.sqlExec(type, sql, params);
    postMessage({ reqId, result });
  } catch (err) {
    console.error("Worker caught error:", err);
    postMessage({ reqId: e.data["reqId"] || -1, error: err.message, stack: err.stack });
  }
};

