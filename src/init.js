import { getSqlite3 } from "./sqlite3.client.js";

const sqlite3 = await getSqlite3();
sqlite3.applyMigrations();

// console.log("created obj ", sqlite3);

// Initialization is now lazy inside SQLiteClient's #call mechanism 
// to prevent Vite top-level await recursive loading bugs.
// sqlite3.init() is no longer required at module level.

export default sqlite3;