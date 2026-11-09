// @ts-ignore
import untar from "js-untar"
import MyFS from "@rushike/myfs";
import sqlite3 from "./init.js";
import {raw} from "./sqlite3.client.js"

/**
 * Incomplete function
 * @param path 
 */
export async function fromTar(path : string) {
  const myfs = new MyFS({ provider: 'opfs' });
  let file = await myfs.readFile(path);
  let tempDirPath = `temp/${Date.now()}`
  await myfs.mkdir(tempDirPath);

  untar(await file.arrayBuffer())
      .progress(function(extractedFile : any) {
        
      })
      .then(function(extractedFiles : File[]) {
        console.log("retrived all files : ", extractedFiles)
      });
}

export async function listTables() {
  return await sqlite3.listTables();
}

/**
 * import table with truncate load strategy
 * @param path string opfs path
 */
export async function fromJson(path : string) {
  // await sqlite3.sql`COMMIT`.run();
  try {
    const myfs = new MyFS({ provider: 'opfs' });
    let text = await (await myfs.readFile(path)).text();
    const rows = JSON.parse(text);
    const table = path.match(/^(.*\/)?(?<fileName>\w*).\w+$/)?.groups?.fileName
    // console.log("rows, table : ", rows, table);
    
    if (!table || !rows || !Array.isArray(rows)) {
      throw new Error("Invalid JSON format. Expected { table: string, rows: [] }");
    }

    if (rows.length === 0) {
      // Just truncate if no rows are provided
      await sqlite3.supersql`DELETE FROM ${raw(table)}`.run();
      return;
    }

    // 3. Extract columns from the first object
    const columns = Object.keys(rows[0]);
    const columnNamesRaw = columns.map(c => raw(c));

    // 4. Truncate and Insert within a Transaction (via worker)
    // Note: Since your client processes messages one-by-one, 
    // we execute these in sequence.
    
    await sqlite3.supersql`DELETE FROM ${raw(table)}`.run();

    // Prepare the INSERT statement
    // INSERT INTO table (col1, col2) VALUES (?, ?), (?, ?)...
    // Process rows: either in a loop or one large batch if your worker supports it
    // For large datasets, a transaction is highly recommended.
    await sqlite3.sql`BEGIN TRANSACTION;`.run();
    
    for (const row of rows) {
      const values = columns.map(col => {
        switch(typeof (row[col])) {
          case "object":
            return JSON.stringify(row[col])
          default:
            return row[col]
        }
      });
      await sqlite3.supersql`INSERT INTO ${raw(table)} (${columnNamesRaw}) VALUES (${values})`.run();
    }

    await sqlite3.sql`COMMIT`.run();
    
    console.log(`Successfully imported ${rows.length} rows into ${table}`);
  } catch (error) {
    await sqlite3.sql`ROLLBACK`.run().catch(() => {}); // Attempt rollback on failure
    console.error("Failed to import JSON table:", error);
    throw error;
  }
}
