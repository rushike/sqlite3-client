// Utility to forbid multiple statements
async function ensureSingleStatement(sql) {
  let count = 0;
  for await (const _ of sqlite3.statements(db, sql)) {
    count++;
    // if (count > 1) {
    //   throw new Error("Multi-statement SQL is not allowed.");
    // }
  }
  return count;
}

class MySQLiteRunner {
  constructor(sqlText, params, sqlite3, db) {
    this.sqlText = sqlText;
    this.params = params; // values from template string
    this.sqlite3 = sqlite3;
    this.db = db;
  }

  async prepare() {
    const { sqlite3, db, sqlText } = this;

    // Reject multi-statements
    const count = await ensureSingleStatement(sqlText, sqlite3, db);
    // if (count !== 1) {
    //   throw new Error("Invalid SQL: no valid single statement prepared.");
    // }

    // Prepare without auto-finalize
    const iter = sqlite3.statements(db, sqlText, { unscoped: true });

    const { value: stmt } = await iter.next();
    if (!stmt) throw new Error("Statement prepare failed.");

    return stmt;
  }

  async run(params = null) {
    const stmt = await this.prepare();
    const { sqlite3 } = this;

    const bindings = params ?? this.params;
    if (bindings.length) sqlite3.bind_collection(stmt, bindings);

    await sqlite3.step(stmt);
    await sqlite3.finalize(stmt);
  }

  async get(params = null) {
    const stmt = await this.prepare();
    const { sqlite3 } = this;

    const bindings = params ?? this.params;
    if (bindings.length) sqlite3.bind_collection(stmt, bindings);

    let result = null;

    const rc = await sqlite3.step(stmt);
    if (rc === SQLite.SQLITE_ROW) {
      const row = sqlite3.row(stmt);
      const cols = sqlite3.column_names(stmt);

      result = {};
      for (let i = 0; i < row.length; i++) {
        result[cols[i]] = row[i];
      }
    }

    await sqlite3.finalize(stmt);
    return result;
  }

  async all(params = null) {
    const stmt = await this.prepare();
    const { sqlite3 } = this;

    const bindings = params ?? this.params;
    if (bindings.length) sqlite3.bind_collection(stmt, bindings);

    const rows = [];
    const cols = sqlite3.column_names(stmt);

    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      const raw = sqlite3.row(stmt);
      const obj = {};
      for (let i = 0; i < raw.length; i++) obj[cols[i]] = raw[i];
      rows.push(obj);
    }

    await sqlite3.finalize(stmt);
    return rows;
  }

  async each(params = null, callback) {
    const stmt = await this.prepare();
    const { sqlite3 } = this;

    const bindings = params ?? this.params;
    if (bindings.length) sqlite3.bind_collection(stmt, bindings);

    const cols = sqlite3.column_names(stmt);

    while (await sqlite3.step(stmt) === SQLite.SQLITE_ROW) {
      const raw = sqlite3.row(stmt);
      const obj = {};
      for (let i = 0; i < raw.length; i++) obj[cols[i]] = raw[i];
      callback(obj);
    }

    await sqlite3.finalize(stmt);
  }
}

// class MySQLite {
//   constructor() {
//     [sqlite3, db] = await initSqlite3(db);
//     this.sqlite3 = sqlite3;
//     this.db = db;
//   }

  
  
//   // Non-template version
//   query(sqlText) {
//     return new MySQLiteRunner(sqlText, [], this.sqlite3, this.db);
//   }

//   // Template-string SQL builder
//   sql(strings, ...values) {
//     // Join template string + embedded values safely
//     const sqlText = strings.reduce(
//       (acc, s, i) => acc + s + (values[i] !== undefined ? "?" : ""),
//       ""
//     );

//     // Values are stored for later binding
//     return new MySQLiteRunner(sqlText, values, this.sqlite3, this.db);
//   }
// }