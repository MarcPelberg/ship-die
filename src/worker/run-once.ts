import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import { DeepSeekProvider } from "../llm/deepseek.js";
import { fetchLinkMetadata } from "../metadata/fetch.js";
import { processMessage } from "../pipeline/process-message.js";

async function main(): Promise<void> {
  if (!env.whatsappGroupJid) {
    throw new Error("WHATSAPP_GROUP_JID is required for the WhatsApp reader");
  }

  const db = createDb();
  const repo = new Repositories(db);
  const provider = new DeepSeekProvider({
    apiKey: env.deepseekApiKey,
    model: env.deepseekModel
  });

  try {
    const messages = await repo.pendingRawMessages(25);
    for (const message of messages) {
      const result = await processMessage({
        message,
        provider,
        repo,
        fetchMetadata: fetchLinkMetadata
      });

      const reason = "reason" in result ? result.reason : undefined;
      console.log(`${message.externalId}: ${result.status}${reason ? ` (${reason})` : ""}`);
    }
  } finally {
    await closeDb(db);
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
