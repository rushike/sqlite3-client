export function createLocalWorker() {
  const localWorker = {
    sqliteRunner: null,
    sqlite3: null,
    db: null,
    onmessage: null,
    onerror: null,
    postMessage: (data) => {
      // Run asynchronously to allow callbacks/promises to settle
      Promise.resolve().then(async () => {
        try {
          const { reqId, type, sql, params, uri } = data;
          if (type === "init") {
            const { initSqlite3 } = await import("./wa-sqlite.js");
            const { SQLiteRunner } = await import("./utils.js");

            if (!localWorker.sqlite3 || !localWorker.db) {
              const res = await initSqlite3(uri);
              localWorker.sqlite3 = res[0];
              localWorker.db = res[1];
              localWorker.sqliteRunner = new SQLiteRunner(localWorker.sqlite3, localWorker.db);
            }
            if (localWorker.onmessage) localWorker.onmessage({ data: { reqId, result: "ok" } });
            return;
          }

          if (!localWorker.sqlite3 || !localWorker.db || !localWorker.sqliteRunner) {
            throw new Error("Database not initialized. Call init() first.");
          }

          if (type === "each") {
            const rows = [];
            await localWorker.sqliteRunner.sqlExecEach(sql, params, rows.push.bind(rows));
            if (localWorker.onmessage) localWorker.onmessage({ data: { reqId, result: rows } });
            return;
          }

          const result = await localWorker.sqliteRunner.sqlExec(type, sql, params);
          if (localWorker.onmessage) localWorker.onmessage({ data: { reqId, result } });
        } catch (err) {
          console.log("err got in local worker : ", err);

          if (localWorker.onmessage) localWorker.onmessage({ data: { reqId: data.reqId || -1, error: err.message } });
        }
      });
    }
  };
  return localWorker;
}
