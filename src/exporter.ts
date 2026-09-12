import sqlite3 from "./init.js";
import { raw } from "./sqlite3.client.js";
import MyFS from "@rushike/myfs";


export async function loadJson(tableName: string) {
  // 1. Fetch all data from the table
  // We use supersql with raw to safely inject the table name
  const rows = await sqlite3.supersql`SELECT * FROM ${raw(tableName)}`.all();

  if (!rows) {
    throw new Error(`Table ${tableName} not found or returned no data.`);
  }

  // 2. Process data (Optional)
  // DB stores JSON strings, using JSON.parse so the resulting file is a clean nested JSON. 
  return JSON.stringify(rows.map((row: any) => Object.entries(row).reduce((acc, [key, value]) => {
    let parsedValue = value as string;

    try {
      parsedValue = JSON.parse(parsedValue)
      console.log("parsed value : ", key, parsedValue);

    } catch (err) {
      // console.log("err : ", err);

    }

    // console.log("parsedeValue : ", value, parsedValue);

    return { ...acc, [key]: parsedValue }
  }, {})
  ), null, 2);
}

/**
 * Export a table to a JSON file in OPFS
 * @param tableName The name of the table to export
 * @param destinationPath Optional custom path in OPFS (defaults to exports/{tableName}.json)
 */
export async function toJson(tableName: string, destinationPath?: string) {
  try {
    // 1. Fetch all data from the table
    // We use supersql with raw to safely inject the table name
    const rows = await sqlite3.supersql`SELECT * FROM ${raw(tableName)}`.all();

    if (!rows) {
      throw new Error(`Table ${tableName} not found or returned no data.`);
    }

    // 2. Process data (Optional)
    // If your DB stores JSON strings, you might want to JSON.parse them here 
    // so the resulting file is a clean nested JSON. 
    // However, keeping them as strings is safer for a 1:1 round-trip.
    const jsonContent = JSON.stringify(rows, null, 2);

    // 3. Determine file path
    const finalPath = destinationPath || `/workspace/database/tables/${tableName}.json`;

    // 4. Ensure directory exists
    const myfs = new MyFS({ provider: 'opfs' });
    if (!destinationPath) {
      await myfs.mkdir("exports").catch(() => { }); // Ignore if exists
    }

    // 5. Write to OPFS
    // @ts-ignore
    await myfs.writeFile(finalPath, jsonContent);

    console.log(`Successfully exported ${rows.length} rows to ${finalPath}`);
    return finalPath;
  } catch (error) {
    console.error(`Failed to export table ${tableName} to JSON:`, error);
    throw error;
  }
}