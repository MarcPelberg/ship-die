import { afterEach, describe, expect, it, vi } from "vitest";

const { on, insert, listGroups, socketOptions, env } = vi.hoisted(() => ({
  on: vi.fn(),
  insert: vi.fn(),
  listGroups: vi.fn(),
  socketOptions: vi.fn(),
  env: { whatsappGroupJid: "", whatsappPairPhone: "", whatsappAuthDir: "unused" }
}));
vi.mock("../../src/config/env.js", () => ({ env }));
vi.mock("../../src/db/client.js", () => ({ createDb: vi.fn(), closeDb: vi.fn() }));
vi.mock("../../src/db/repositories.js", () => ({
  Repositories: class { insertRawMessage = insert; }
}));
vi.mock("baileys", async (importOriginal) => ({
  ...await importOriginal<typeof import("baileys")>(),
  default: (options: unknown) => {
    socketOptions(options);
    return { ev: { on }, groupFetchAllParticipating: listGroups };
  },
  DisconnectReason: {},
  useMultiFileAuthState: () => ({ state: {}, saveCreds: vi.fn() })
}));

const messages = ["archive@g.us", "other@g.us", "direct@s.whatsapp.net"].map(remoteJid => ({
  key: { remoteJid, id: remoteJid }, messageTimestamp: 1700000000, message: { conversation: "example" }
}));

async function startReader(groupJid: string) {
  env.whatsappGroupJid = groupJid;
  await import("../../src/ingest/baileys-reader.js");
  return Object.fromEntries(on.mock.calls);
}

afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.resetModules();
});

describe("WhatsApp reader group scope", () => {
  it.each(["/Ship!=Die", "/ship! = die development"])("pairs without storing messages and shows only the unique match for %s", async subject => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const handlers = await startReader("");
    expect(socketOptions.mock.calls[0][0].shouldSyncHistoryMessage({ syncType: 2 })).toBe(false);
    const archive = { id: "archive@g.us", subject };
    listGroups.mockResolvedValue({ archive, other: { id: "other@g.us", subject: "Other" } });
    await handlers["connection.update"]({ connection: "open" });
    await handlers["messages.upsert"]({ type: "notify", messages });
    expect(insert).not.toHaveBeenCalled();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("WHATSAPP_GROUP_JID=archive@g.us"));
    expect(JSON.stringify(log.mock.calls)).not.toContain("other@g.us");

    log.mockClear();
    listGroups.mockResolvedValue({
      archive,
      duplicate: { id: "duplicate@g.us", subject: "/ship! = die development" }
    });
    await handlers["connection.update"]({ connection: "open" });
    expect(log).not.toHaveBeenCalledWith(expect.stringContaining("WHATSAPP_GROUP_JID="));
  });

  it.each([["messages.upsert", "notify"], ["messages.upsert", "append"], ["messaging-history.set", undefined]])("filters %s/%s to the pinned group and applies the live cutoff", async (event, type) => {
    const handlers = await startReader("archive@g.us");
    expect(socketOptions.mock.calls[0][0].shouldSyncHistoryMessage({ syncType: 2 })).toBe(true);
    await handlers[event!]({ type, messages });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ groupId: "archive@g.us" }), { applyReaderCutoff: true });
  });
  it("extracts the current ephemeral text and a document caption without quoted or view-once content", async () => {
    const handlers = await startReader("archive@g.us");
    const bodies = [
      { ephemeralMessage: { message: { extendedTextMessage: { text: "new content", contextInfo: { quotedMessage: { conversation: "quoted" } } } } } },
      { documentWithCaptionMessage: { message: { documentMessage: { caption: "document caption" } } } },
      { viewOnceMessageV2: { message: { imageMessage: { caption: "view once" } } } }
    ];
    await handlers["messaging-history.set"]({ messages: bodies.map((message, i) => ({
      ...messages[0], key: { remoteJid: "archive@g.us", id: String(i) }, message
    })) });
    expect(insert.mock.calls.map(([raw]) => raw.text)).toEqual(["new content", "document caption"]);
  });
});
