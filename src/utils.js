// Import the Javascript API wrappers.
import * as SQLite from 'wa-sqlite';

export class SQLiteRunner {
  constructor(sqlite3, db) {
    this.sqlite3 = sqlite3;
    this.db = db;
  }

  async ensureSingleStatement(sql) {
    return;
    // Trim whitespace + semicolons
    const cleaned = sql.trim().replace(/;+$/, "");

    // Empty string → invalid
    if (!cleaned) {
      throw new Error("Empty SQL statement.");
    }

    // Very simple safety check:
    // If more than one ';' exists in cleaned SQL, reject it.
    const parts = cleaned.split(";");
    if (parts.length > 1) {
      throw new Error("Multiple SQL statements detected. Only one statement allowed.");
    }
  }

  async sqlExec(type, sql, params) {
    await this.ensureSingleStatement(sql);

    const iter = this.sqlite3.statements(this.db, sql, { unscoped: true });
    const { value: stmt } = await iter.next();
    if (!stmt) throw new Error("Failed to prepare.");

    if (params.length) this.sqlite3.bind_collection(stmt, params);

    if (type === "run") {
      await this.sqlite3.step(stmt);
      const changes = this.sqlite3.changes(this.db);
      await this.sqlite3.finalize(stmt);
      return { changes };
    }

    if (type === "get") {
      let row = null;
      if (await this.sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        row = this.rowToObject(stmt);
      }
      await this.sqlite3.finalize(stmt);
      return row;
    }

    if (type === "all") {
      const rows = [];
      while (await this.sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
        rows.push(this.rowToObject(stmt));
      }
      await this.sqlite3.finalize(stmt);
      return rows;
    }
  }

  async sqlExecEach(sql, params, callback) {
    await this.ensureSingleStatement(sql);

    const iter = this.sqlite3.statements(this.db, sql, { unscoped: true });
    const { value: stmt } = await iter.next();
    if (!stmt) throw new Error("Prepare failed");

    if (params?.length) this.sqlite3.bind_collection(stmt, params);

    while (await this.sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      callback(this.rowToObject(stmt));
    }

    await this.sqlite3.finalize(stmt);
  }

  rowToObject(stmt) {
    const cols = this.sqlite3.column_names(stmt);
    const raw = this.sqlite3.row(stmt);
    const obj = {};
    for (let i = 0; i < raw.length; i++) obj[cols[i]] = raw[i];
    return obj;
  }

  async sql(strings, ...values) {
    let text = "";
    const params = [];

    for (let i = 0; i < strings.length; i++) {
      text += strings[i];
      if (i < values.length) {
        text += "?";
        params.push(values[i]);
      }
    }

    return this.sqlExec("run", text, params);
  }

  // template tag
  sql(strings, ...values) {
    const sqlText = strings.reduce((acc, s, i) => acc + s + (values[i] ? "?" : ""), "");
    return {
      run: () => this.sqlExec("run", sqlText, values),
      get: () => this.sqlExec("get", sqlText, values),
      all: () => this.sqlExec("all", sqlText, values),
      each: () => this.sqlExecEach("each", sqlText, values),
    };
  }
}

export function semaphore() {
  let locked = false;
  let queue = [];
  return {
    acquire: () => {
      if (!locked) {
        locked = true;
        return Promise.resolve();
      }
      return new Promise(resolve => queue.push(resolve));
    },
    release: () => {
      if (queue.length > 0) {
        const resolve = queue.shift();
        resolve();
      } else {
        locked = false;
      }
    }
  };
}
