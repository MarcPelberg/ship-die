import { readFile } from "node:fs/promises";
import type { RawMessageInput } from "../domain/types.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";

type FixtureRawMessage = Omit<RawMessageInput, "occurredAt"> & {
  occurredAt: string;
};

async function main(): Promise<void> {
  const fixturePath = process.argv[2];
  if (!fixturePath) {
    throw new Error("Usage: npm run ingest:fixture -- fixtures/sample-chat.json");
  }

  const rows = JSON.parse(await readFile(fixturePath, "utf8")) as FixtureRawMessage[];
  const db = createDb();
  const repo = new Repositories(db);

  try {
    for (const row of rows) {
      await repo.insertRawMessage({
        ...row,
        occurredAt: new Date(row.occurredAt)
      });
      console.log(`inserted ${row.externalId}`);
    }
  } finally {
    await closeDb(db);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
