/// sql-provider.js
import db from "./init";

export const sqlProvider = {
  async execute(sql: string) {
    // Basic detection for query type
    const trimmed = sql.trim().toLowerCase();
    if (trimmed.startsWith("select") || trimmed.startsWith("pragma")) {
      return await db.sql([sql]).all();
    }
    return await db.sql([sql]).run();
  },
  async getTables() {
    const res = await db.listTables();
    // @ts-ignore
    return res.map(r => r.name);
  },
  async getTableSchema(name: string) {
    return await db.getSchema(name);
  }
};