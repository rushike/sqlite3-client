import { semaphore } from "./utils.js";
import { createLocalWorker } from "./sqlite3.localworker.js";
import SqliteWorker from './sqlite3.worker.js?worker';
import SharedSqliteWorker from './sqlite3.sharedworker.js?sharedworker';

export class SQLiteClient {
  constructor(dbName = "myfinsheet-client1", workerType = null) {
    this.dbName = dbName;
    this.workerType = workerType;
    this.reqId = 0;
    this.callbacks = new Map();
  }

  _ensureWorker() {
    if (!this._workerPromise) {
      this._workerPromise = this._initWorker();
    }
    return this._workerPromise;
  }

  _initWorker() {
    if (this.workerType === "local") {
      this.messageTarget = createLocalWorker();
      this.worker = this.messageTarget;
    } else if (this.workerType === "shared") {
      this.worker = new SharedSqliteWorker({ name: this.dbName });
      this.messageTarget = this.worker.port;
    } else {
      this.worker = new SqliteWorker();
      this.messageTarget = this.worker;
    }

    this.messageTarget.onmessage = (e) => {
      const { reqId, result, error, fatal } = e.data;

      if (fatal) {
        console.error("Worker fatal error:", error);
        for (const { reject } of this.callbacks.values()) {
          reject(new Error(`${this.workerType} Worker crashed: ` + error));
        }
        this.callbacks.clear();
        return;
      }

      const cb = this.callbacks.get(reqId);
      if (cb === undefined) return;

      if (error != null) {
        console.error("failed sql : ", cb, cb.type, cb.sql, cb.params, result);
        if (e.data.stack) {
          console.error("Worker Stack Trace:\n", e.data.stack);
        }
        cb.reject(new Error(error + (cb.sql ? " : " + cb.sql : "")));
      } else {
        cb.resolve(result);
      }

      this.callbacks.delete(reqId);
    };

    this.worker.onerror = (err) => {
      console.log("Worker error", err);
      for (const { reject } of this.callbacks.values()) {
        reject(new Error(`${this.workerType} Worker crashed`));
      }
      this.callbacks.clear();
    };

    // Send the init message manually here
    return new Promise((resolve, reject) => {
      const reqId = ++this.reqId;
      this.callbacks.set(reqId, { resolve, reject, type: "init" });
      if (this.workerType === "shared") {
        this.messageTarget.start();
      }
      this.messageTarget.postMessage({ reqId, type: "init", uri: this.dbName });
    });
  }

  async init() {
    // Kept for backward compatibility, but does nothing since it's lazy now
    return await this._ensureWorker();
  }

  async applyMigrations() {
    // const { applyFullSchema, applyMigrations: doApplyMigrations } = await import("./migrations.js");
    // await applyFullSchema(this);
    // await doApplyMigrations(this);
    return await this.#call({
      type: "migrations"
    })
  }

  async listTables() {
    return await this.sql`
        SELECT name 
        FROM sqlite_master 
        WHERE type='table'
        ORDER BY name;
    `.all();
  }

  async getSchema(table) {
    return await this.supersql`
      PRAGMA table_info(${raw(table)})
    `.all();
  }

  async #call(payload) {
    await this._ensureWorker();
    return new Promise((resolve, reject) => {
      const reqId = ++this.reqId;

      this.callbacks.set(reqId, { resolve, reject, type: payload.type, sql: payload.sql, params: payload.params });
      this.messageTarget.postMessage({ reqId, ...payload });
    });
  }

  supersql = (strings, ...values) => {
    const params = [];

    const sqlText = strings.reduce((acc, str, i) => {
      const val = values[i];
      let placeholder = "";

      if (i < values.length) {
        if (val && typeof val === 'object' && val.__isRaw) {
          // 1. Handle Raw Identifiers (Table names, Column names)
          placeholder = val.value;
        } else if (val && typeof val === 'object' && val.__isFragment) {
          // 2. Handle Query Fragments
          placeholder = val.sql;
          params.push(...val.params);
        } else if (Array.isArray(val)) {
          // 3. Handle Arrays (e.g., for IN clauses, SET clauses, Column lists)
          placeholder = val.map(v => {
            if (v && v.__isRaw) return v.value;
            if (v && v.__isFragment) {
              params.push(...v.params);
              return v.sql;
            }
            params.push(v);
            return "?";
          }).join(", ");
        } else {
          // 4. Handle Standard Parameters
          params.push(val);
          placeholder = "?";
        }
      }
      return acc + str + placeholder;
    }, "");

    return {
      __isFragment: true,
      run: () => this.#call({ type: "run", sql: sqlText, params }),
      get: () => this.#call({ type: "get", sql: sqlText, params }),
      all: () => this.#call({ type: "all", sql: sqlText, params }),
      sql: sqlText, // Useful for debugging
      params: params
    };
  }

  // template tag
  sql = (strings, ...values) => {
    // console.log("string, : ", strings, " reduce : ", strings.reduce);

    const sqlText = strings.reduce((acc, s, i) => {
      const hasValue = i < values.length;  // do NOT test truthiness!
      return acc + s + (hasValue ? "?" : "");
    }, "");

    return {
      run: () => this.#call({ type: "run", sql: sqlText, params: values }),
      get: () => this.#call({ type: "get", sql: sqlText, params: values }),
      all: () => this.#call({ type: "all", sql: sqlText, params: values }),
      each: () => this.#call({ type: "each", sql: sqlText, params: values }),
    };
  }
}


export const raw = (value) => ({ __isRaw: true, value });

export const suta = (array, separator = ", ") => ({
  __isFragment: true,
  sql: array.map(v => {
    if (v && v.__isRaw) return v.value;
    if (v && v.__isFragment) return v.sql;
    return "?";
  }).join(separator),
  params: array.flatMap(v => {
    if (v && (v.__isRaw || v.__isFragment)) return v.params || [];
    return [v];
  })
});


const instanceMap = new Map();
const instanceSemaphore = semaphore();

export async function getSqlite3(dbName = "myfinsheet-client1", workerType = null) {
  const instanceKey = `${dbName}-${workerType}`;
  if (instanceMap.has(instanceKey)) {
    return instanceMap.get(instanceKey);
  }
  else {
    await instanceSemaphore.acquire();
    try {
      if (instanceMap.has(instanceKey)) {
        return instanceMap.get(instanceKey);
      }
      const sqlite3 = new SQLiteClient(dbName, workerType);
      // await sqlite3.init();
      instanceMap.set(instanceKey, sqlite3);
      return sqlite3;
    } finally {
      instanceSemaphore.release();
    }
  }
}

// export default await getSqlite3();