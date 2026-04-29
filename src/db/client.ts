import pg from "pg";
import { env } from "../config/env.js";

export type Db = pg.Pool;

export function createDb(databaseUrl = env.databaseUrl): Db {
  return new pg.Pool({ connectionString: databaseUrl });
}

export async function closeDb(db: Db): Promise<void> {
  await db.end();
}
