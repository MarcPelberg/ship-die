import makeWASocket, { Browsers, DisconnectReason, fetchLatestWaWebVersion, useMultiFileAuthState } from "baileys";
import P from "pino";
import qrcode from "qrcode-terminal";
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
  const db = createDb();
  const repo = new Repositories(db);
  const targetGroupJid = env.whatsappGroupJid.trim();
  const pairingPhone = env.whatsappPairPhone.replace(/\D/g, "");
  if (!targetGroupJid) {
    console.warn("WHATSAPP_GROUP_JID is empty; reader will ingest all WhatsApp group chats and print discovered group JIDs.");
  }
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
  const { version } = await fetchLatestWaWebVersion();
  const sock = makeWASocket({
    auth: state,
    logger: P({ level: "info" }),
    browser: Browsers.macOS("Desktop"),
    version,
    printQRInTerminal: true
  });

  if (pairingPhone) {
    let pairingPrinted = false;
    const tryPairing = async (): Promise<void> => {
      if (pairingPrinted || sock.authState.creds.registered) return;
      try {
        const code = await sock.requestPairingCode(pairingPhone);
        pairingPrinted = true;
        console.log(`pairing code: ${code}`);
      } catch {
        setTimeout(() => {
          void tryPairing();
        }, 1000);
      }
    };

    void tryPairing();
  }

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", (update) => {
    const code = (update.lastDisconnect?.error as any)?.output?.statusCode;
    console.log("whatsapp connection", { connection: update.connection, qr: Boolean(update.qr), code });
    if (update.qr) {
      qrcode.generate(update.qr, { small: true });
      console.log("Scan this QR with the dedicated WhatsApp account (Linked devices).");
    }
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
      const remoteJid = item.key.remoteJid ?? "";
      const isGroup = remoteJid.endsWith("@g.us");
      if (!isGroup) continue;
      if (targetGroupJid && remoteJid !== targetGroupJid) continue;
      const text = messageText(item.message);
      if (!text) continue;
      if (!targetGroupJid) {
        console.log(`discovered group jid: ${remoteJid}`);
      }
      const raw: RawMessageInput = {
        externalId: item.key.id || `${item.key.remoteJid}-${Date.now()}`,
        groupId: remoteJid,
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
