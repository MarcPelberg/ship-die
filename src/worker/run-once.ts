import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import { DeepSeekProvider } from "../llm/deepseek.js";
import { LocalFallbackProvider } from "../llm/local-fallback.js";
import { OvhCurator, publicRepository } from "../llm/ovh-curator.js";
import { fetchLinkMetadata } from "../metadata/fetch.js";
import { processMessage } from "../pipeline/process-message.js";

async function main(): Promise<void> {
  const apiKey = env.deepseekApiKey.trim();
  if (!apiKey && !env.localCuratorModel && !["development", "test"].includes(process.env.NODE_ENV ?? "")) {
    throw new Error("Configure LOCAL_CURATOR_MODEL or DEEPSEEK_API_KEY to process messages.");
  }
  const db = createDb();
  const client = await db.connect();
  const repo = new Repositories(client, env.localCuratorModel || (apiKey ? env.deepseekModel : "development fallback"));
  let provider;
  if (env.localCuratorModel) {
    provider = new OvhCurator(env.localCuratorModel);
  } else if (apiKey) {
    provider = new DeepSeekProvider({ apiKey, model: env.deepseekModel });
  } else {
    provider = new LocalFallbackProvider();
    console.warn("DEEPSEEK_API_KEY missing; using local fallback provider for curation");
  }

  try {
    const group = env.whatsappGroupJid.trim();
    if (process.env.NODE_ENV === "production" && !group.endsWith("@g.us")) {
      console.info("Waiting for the dedicated WhatsApp group to be linked and pinned.");
      return;
    }
    // A second worker must not publish the same pending batch.
    const lock = await client.query<{ locked: boolean }>("select pg_try_advisory_lock(hashtext('ship-die-worker')) as locked");
    if (!lock.rows[0].locked) return;
    const messages = await repo.pendingRawMessages(25, group);
    for (const message of messages) {
      await client.query("begin");
      try {
        const result = await processMessage({
          message,
          provider,
          repo,
          fetchMetadata: env.localCuratorModel ? publicRepository : fetchLinkMetadata,
          retryMetadataErrors: Boolean(env.localCuratorModel)
        });
        await client.query("commit");
        console.log(`Curation result: ${result.status}`);
      } catch {
        await client.query("rollback");
        await client.query("update raw_messages set last_attempt_at = now() where external_id = $1", [message.externalId]);
        console.error("Curation failed; message stays pending for retry.");
      }
    }
  } finally {
    client.release(true);
    await closeDb(db);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
