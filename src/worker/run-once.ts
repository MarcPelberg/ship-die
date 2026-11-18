import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import { DeepSeekProvider } from "../llm/deepseek.js";
import { LocalFallbackProvider } from "../llm/local-fallback.js";
import { fetchLinkMetadata } from "../metadata/fetch.js";
import { processMessage } from "../pipeline/process-message.js";

async function main(): Promise<void> {
  const apiKey = env.deepseekApiKey.trim();
  if (!apiKey && !["development", "test"].includes(process.env.NODE_ENV ?? "")) {
    throw new Error("Set DEEPSEEK_API_KEY to process pending messages in production.");
  }
  const db = createDb();
  const repo = new Repositories(db);
  const provider = apiKey
    ? new DeepSeekProvider({
        apiKey,
        model: env.deepseekModel
      })
    : new LocalFallbackProvider();

  if (!apiKey) {
    console.warn("DEEPSEEK_API_KEY missing; using local fallback provider for curation");
  }

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
