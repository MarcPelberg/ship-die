import { afterEach, describe, expect, it, vi } from "vitest";

const { on, insert, listGroups, env } = vi.hoisted(() => ({
  on: vi.fn(),
  insert: vi.fn(),
  listGroups: vi.fn(),
  env: { whatsappGroupJid: "", whatsappPairPhone: "", whatsappAuthDir: "unused" }
}));
vi.mock("../../src/config/env.js", () => ({ env }));
vi.mock("../../src/db/client.js", () => ({ createDb: vi.fn(), closeDb: vi.fn() }));
vi.mock("../../src/db/repositories.js", () => ({
  Repositories: class { insertRawMessage = insert; }
}));
vi.mock("baileys", () => ({
  default: () => ({ ev: { on }, groupFetchAllParticipating: listGroups }),
  Browsers: { macOS: vi.fn() },
  DisconnectReason: {},
  fetchLatestWaWebVersion: () => ({ version: [] }),
  useMultiFileAuthState: () => ({ state: {}, saveCreds: vi.fn() })
}));

const messages = ["archive@g.us", "other@g.us", "direct@s.whatsapp.net"].map(remoteJid => ({
  key: { remoteJid, id: remoteJid }, message: { conversation: "example" }
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

  it("stores only notifications from the pinned group", async () => {
    const handlers = await startReader("archive@g.us");
    await handlers["messages.upsert"]({ type: "notify", messages });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({ groupId: "archive@g.us" }));
  });
});
