/// sql-provider.js
import db from "./init";

export const sqlProvider = {
  async execute(sql: string) {
    const trimmed = sql.trim().toLowerCase();
    const statements = sql
      .split(";")
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith("--"));

    const isSingleStatement = statements.length <= 1;
    const isSelect = (trimmed.startsWith("select") || trimmed.startsWith("explain")) && !trimmed.startsWith("select into");
    const isPragmaRead = trimmed.startsWith("pragma") && (
      trimmed.includes("table_info") || 
      trimmed.includes("table_list") || 
      trimmed.includes("index_list") || 
      trimmed.includes("foreign_key_list") ||
      trimmed.includes("database_list")
    );

    if (isSingleStatement && (isSelect || isPragmaRead)) {
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