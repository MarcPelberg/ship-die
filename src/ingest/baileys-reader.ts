import makeWASocket, { DisconnectReason, useMultiFileAuthState } from "baileys";
import P from "pino";
import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import type { RawMessageInput } from "../domain/types.js";

function messageText(message: any): string {
  return message?.conversation
    || message?.extendedTextMessage?.text
    || message?.imageMessage?.caption
    || message?.videoMessage?.caption
    || "";
}

async function main(): Promise<void> {
  if (!env.whatsappGroupJid) {
    throw new Error("WHATSAPP_GROUP_JID is required for the WhatsApp reader");
  }

  const db = createDb();
  const repo = new Repositories(db);
  let shutdownStarted = false;
  async function shutdown(exitCode: number): Promise<void> {
    if (shutdownStarted) return;
    shutdownStarted = true;
    try {
      await closeDb(db);
    } finally {
      process.exit(exitCode);
    }
  }

  const { state, saveCreds } = await useMultiFileAuthState(env.whatsappAuthDir);
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "info" }),
    browser: ["ShipDie", "Chrome", "0.1"]
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const code = (update.lastDisconnect?.error as any)?.output?.statusCode;
    console.log("whatsapp connection", { connection: update.connection, qr: Boolean(update.qr), code });
    if (update.connection === "close") {
      const exitCode = code === DisconnectReason.loggedOut ? 0 : 1;
      if (exitCode === 1) {
        console.log("connection closed; exiting so a supervisor can restart the reader");
      } else {
        console.log("logged out; exiting the reader");
      }
      void shutdown(exitCode);
    }
  });

  sock.ev.on("messages.upsert", async ({ type, messages }) => {
    if (type !== "notify") return;

    for (const item of messages) {
      if (item.key.remoteJid !== env.whatsappGroupJid) continue;
      const text = messageText(item.message);
      if (!text) continue;
      const raw: RawMessageInput = {
        externalId: item.key.id || `${item.key.remoteJid}-${Date.now()}`,
        groupId: item.key.remoteJid || env.whatsappGroupJid,
        senderId: item.key.participant ?? undefined,
        occurredAt: new Date((Number(item.messageTimestamp) || Date.now() / 1000) * 1000),
        text,
        raw: item
      };
      await repo.insertRawMessage(raw);
      console.log(`stored whatsapp message ${raw.externalId}`);
    }
  });

  process.on("SIGINT", async () => {
    await shutdown(0);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
