import makeWASocket, { DisconnectReason, normalizeMessageContent, proto, useMultiFileAuthState, type WAMessage } from "baileys";
import P from "pino";
import qrcode from "qrcode-terminal";
import { env } from "../config/env.js";
import { createDb, closeDb } from "../db/client.js";
import { Repositories } from "../db/repositories.js";
import type { RawMessageInput } from "../domain/types.js";
import { GroupHistoryRecovery } from "./group-history.js";

function messageText(message: WAMessage["message"]): string {
  const outer = message?.ephemeralMessage?.message ?? message;
  if (outer?.viewOnceMessage || outer?.viewOnceMessageV2 || outer?.viewOnceMessageV2Extension) return "";
  const body = normalizeMessageContent(outer);
  return body?.conversation
    || body?.extendedTextMessage?.text
    || body?.imageMessage?.caption
    || body?.videoMessage?.caption
    || body?.documentMessage?.caption
    || "";
}

async function main(): Promise<void> {
  const db = createDb();
  const repo = new Repositories(db);
  const targetGroupJid = env.whatsappGroupJid.trim();
  const pairingPhone = env.whatsappPairPhone.replace(/\D/g, "");
  if (!targetGroupJid) {
    console.warn("Pairing mode. Set WHATSAPP_GROUP_JID to enable ingestion.");
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
  const sock = makeWASocket({
    auth: state,
    shouldSyncHistoryMessage: () => targetGroupJid.endsWith("@g.us"),
    logger: P({ level: "silent" })
  });
  const recovery = targetGroupJid.endsWith("@g.us") ? new GroupHistoryRecovery(targetGroupJid, db, sock.fetchMessageHistory) : undefined;

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

  sock.ev.on("connection.update", async (update) => {
    const code = (update.lastDisconnect?.error as any)?.output?.statusCode;
    console.log("whatsapp connection", { connection: update.connection, qr: Boolean(update.qr), code });
    if (update.connection === "open" && recovery) {
      await recovery.resumeIfRequested();
      try {
        const { creation } = await sock.groupMetadata(targetGroupJid);
        if (creation && Number.isSafeInteger(creation)) {
          console.log("Pinned group created (UTC)", new Date(creation * 1000).toISOString().slice(0, 10));
        }
      } catch {
        console.warn("Pinned group creation date unavailable.");
      }
    }
    if (update.qr) {
      qrcode.generate(update.qr, { small: true });
      console.log("Scan this QR with the dedicated WhatsApp account (Linked devices).");
    }
    if (update.connection === "open" && !targetGroupJid) {
      try {
        const groups = await sock.groupFetchAllParticipating();
        const matches = Object.values(groups).filter(group =>
          group.subject === "/Ship!=Die" || group.subject === "/ship! = die development"
        );
        if (matches.length === 1) {
          console.log(`Set WHATSAPP_GROUP_JID=${matches[0].id} and restart the reader.`);
        } else {
          console.warn("Could not uniquely identify the Ship != Die group. Check membership and confirm its JID.");
        }
      } catch {
        console.warn("Group lookup failed. Check the linked device and restart the reader.");
      }
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

  async function storeGroupMessages(messages: WAMessage[]): Promise<void> {
    if (!targetGroupJid) return;
    for (const item of messages) {
      const remoteJid = item.key.remoteJid ?? "";
      if (remoteJid !== targetGroupJid || !remoteJid.endsWith("@g.us")) continue;
      const timestamp = Number(item.messageTimestamp);
      if (!item.key.id || !Number.isFinite(timestamp) || timestamp <= 0) continue;
      const text = messageText(item.message);
      if (!text) continue;
      const raw: RawMessageInput = {
        externalId: item.key.id,
        groupId: remoteJid,
        senderId: item.key.participant ?? undefined,
        occurredAt: new Date(timestamp * 1000),
        text,
        raw: typeof item.key.fromMe === "boolean" ? { fromMe: item.key.fromMe } : {}
      };
      await repo.insertRawMessage(raw, { applyReaderCutoff: true });
    }
  }

  sock.ev.on("messages.upsert", async ({ messages }) => {
    await storeGroupMessages(messages);
    await recovery?.observe(messages);
  });
  sock.ev.on("messaging-history.set", async ({ messages, syncType, peerDataRequestSessionId, progress }) => {
    await storeGroupMessages(messages);
    const onDemand = syncType === proto.HistorySync.HistorySyncType.ON_DEMAND;
    await recovery?.observe(messages, onDemand ? peerDataRequestSessionId || null : undefined, progress == null || progress >= 100);
  });

  process.on("SIGINT", async () => {
    await shutdown(0);
  });
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
