import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { createDb, closeDb } from "../src/db/client.js";

async function main() {
  const db = createDb();
  try {
    await db.query("create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())");
    const dir = path.resolve("db/migrations");
    const files = (await readdir(dir)).filter((file) => file.endsWith(".sql")).sort();
    for (const file of files) {
      const existing = await db.query("select 1 from schema_migrations where name = $1", [file]);
      if (existing.rowCount) continue;
      const sql = await readFile(path.join(dir, file), "utf8");
      await db.query("begin");
      await db.query(sql);
      await db.query("insert into schema_migrations (name) values ($1)", [file]);
      await db.query("commit");
      console.log(`applied ${file}`);
    }
  } catch (error) {
    await db.query("rollback").catch(() => undefined);
    throw error;
  } finally {
    await closeDb(db);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
