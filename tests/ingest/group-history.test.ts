import { describe, expect, it, vi } from "vitest";
import type { WAMessage } from "baileys";
import { GroupHistoryRecovery } from "../../src/ingest/group-history.js";

const group = "test@g.us";
function message(seconds: number, remoteJid = group): WAMessage {
  return { key: { remoteJid, id: String(seconds), fromMe: false }, messageTimestamp: seconds, message: { imageMessage: {} } };
}

function setup() {
  let state: string | undefined;
  const query = vi.fn(async (sql: string, [, next, previous]: string[]) => {
    if (sql.startsWith("select")) return { rows: state ? [{ value: JSON.parse(state) }] : [], rowCount: state ? 1 : 0 };
    if (sql.startsWith("insert") ? state === undefined : state === previous) {
      state = next;
      return { rows: [], rowCount: 1 };
    }
    return { rows: [], rowCount: 0 };
  });
  let requests = 0;
  const fetch = vi.fn(async () => `request-${++requests}`);
  const reader = () => new GroupHistoryRecovery(group, { query }, fetch);
  return { reader, fetch, state: () => JSON.parse(state!), resume: () => {
    state = JSON.stringify({ ...JSON.parse(state!), status: "resume_requested" });
  } };
}

describe("bounded WhatsApp group history recovery", () => {
  it("requires an authentic pinned-group direction, ID and timestamp; media without captions can anchor", async () => {
    const test = setup();
    const reader = test.reader();
    await reader.observe([message(2, "elsewhere@g.us"), { ...message(8), key: { remoteJid: group, id: "missing-direction" } }]);
    expect(test.fetch).not.toHaveBeenCalled();
    await Promise.all([reader.observe([message(20), message(10), message(1, "elsewhere@g.us")]), test.reader().observe([message(30)])]);
    expect(test.fetch).toHaveBeenCalledTimes(1);
    expect(test.fetch).toHaveBeenCalledWith(50, { remoteJid: group, id: "10", fromMe: false }, 10000);
    await test.reader().observe([message(5)]);
    expect(test.fetch).toHaveBeenCalledTimes(1);
  });

  it("pages only on a correlated response, retaining the oldest target-group result across its chunks", async () => {
    const test = setup();
    const reader = test.reader();
    await reader.observe([message(40)]);
    await reader.observe([message(10)], null);
    await reader.observe([message(15)], "unrelated");
    await reader.observe([message(20), message(1, "other@g.us")], "request-1", false);
    expect(test.fetch).toHaveBeenCalledTimes(1);
    await reader.observe([message(30)], "request-1");
    expect(test.fetch).toHaveBeenLastCalledWith(50, { remoteJid: group, id: "20", fromMe: false }, 20000);
    await reader.observe([message(5)], "request-1");
    await reader.observe([message(21)], "request-2");
    expect(test.fetch).toHaveBeenCalledTimes(2);
    expect(test.state().status).toBe("no_older_returned");
  });

  it("persists the last advancing anchor at the cap, and requires an operator decision to resume", async () => {
    const test = setup();
    const reader = test.reader();
    await reader.observe([message(100)]);
    for (let n = 1; n <= 24; n++) await reader.observe([message(100 - n)], `request-${n}`);
    expect(test.fetch).toHaveBeenCalledTimes(24);
    expect(test.state()).toMatchObject({ status: "page_limit", pages: 24, oldestReturned: { timestampMs: 76000 } });
    await test.reader().resumeIfRequested();
    expect(test.fetch).toHaveBeenCalledTimes(24);
    test.resume();
    await Promise.all([test.reader().resumeIfRequested(), test.reader().resumeIfRequested()]);
    expect(test.fetch).toHaveBeenCalledTimes(25);
    expect(test.fetch).toHaveBeenLastCalledWith(50, { remoteJid: group, id: "76", fromMe: false }, 76000);
  });

  it("records uncertain delivery without repeating the request on reconnect", async () => {
    const test = setup();
    test.fetch.mockRejectedValueOnce(new Error("offline"));
    await test.reader().observe([message(100)]);
    expect(test.state().status).toBe("send_failed");
    await test.reader().observe([message(80)]);
    expect(test.fetch).toHaveBeenCalledTimes(1);
  });
});
