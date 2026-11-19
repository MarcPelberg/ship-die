import type { Db } from "../../src/db/client.js";
import { describe, expect, it, vi } from "vitest";
import { deliverJoinNotifications, joinEmail } from "../../src/worker/join-notifications.js";

const application = {
  id: "72", name: "Example Builder", whatsapp_phone: "+12025550146",
  background: "My background is in software.\nContact example@example.invalid."
};

function connection(rows: (typeof application)[]) {
  const queue = [...rows];
  const query = vi.fn(async (sql: string, _values?: unknown[]) => (
    sql.includes("for update skip locked") ? { rows: queue.length ? [queue.shift()] : [] } : { rows: [] }
  ));
  const release = vi.fn();
  const db = { connect: async () => ({ query, release }) } as unknown as Pick<Db, "connect">;
  return { db, query, release };
}

describe("join notification delivery", () => {
  it("addresses one configured recipient and keeps applicant responses in the plain-text body", () => {
    const message = joinEmail(application, "join@example.invalid", "owner@example.invalid");
    expect(message.Destination).toEqual({ ToAddresses: ["owner@example.invalid"] });
    expect(message.FromEmailAddress).toBe("AI Ship or Die <join@example.invalid>");
    expect(message.Content?.Simple?.Subject?.Data).toBe("New WhatsApp group application #72");
    const body = message.Content?.Simple?.Body;
    expect(Object.keys(body!)).toEqual(["Text"]);
    for (const field of [application.name, application.whatsapp_phone, application.background]) {
      expect(body?.Text?.Data).toContain(field);
    }
  });

  it("acks accepted notifications, defers failures and continues processing other applications", async () => {
    const next = { ...application, id: "73" };
    const { db, query, release } = connection([application, next]);
    const send = vi.fn().mockRejectedValueOnce(new Error("provider unavailable")).mockResolvedValueOnce(undefined);
    expect(await deliverJoinNotifications(db, send)).toEqual({ sent: 1, deferred: 1 });
    expect(send.mock.calls).toEqual([[application], [next]]);
    const updates = query.mock.calls.filter(([sql]) => sql.includes("update group_join_requests"));
    expect(updates[0]).toEqual([expect.stringContaining("notification_due_at = clock_timestamp() +"), ["72"]]);
    expect(updates[1]).toEqual([expect.stringContaining("notification_due_at = null"), ["73"]]);
    expect(query.mock.calls.filter(([sql]) => sql === "commit")).toHaveLength(3);
    expect(release).toHaveBeenCalledWith(true);
  });

  it("does not call the transport when no application is due", async () => {
    const { db } = connection([]);
    const send = vi.fn();
    expect(await deliverJoinNotifications(db, send)).toEqual({ sent: 0, deferred: 0 });
    expect(send).not.toHaveBeenCalled();
  });

  it("closes a damaged database session so its transaction is rolled back", async () => {
    const { db, query, release } = connection([application]);
    query.mockRejectedValueOnce(new Error("database unavailable"));
    const send = vi.fn();
    await expect(deliverJoinNotifications(db, send)).rejects.toThrow("database unavailable");
    expect(send).not.toHaveBeenCalled();
    expect(release).toHaveBeenCalledWith(true);
  });
});
