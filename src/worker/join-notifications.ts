import type { Db } from "../db/client.js";
import type { SendEmailCommandInput } from "@aws-sdk/client-sesv2";

export type JoinApplication = {
  id: string;
  name: string;
  whatsapp_phone: string;
  background: string;
};

export function joinEmail(request: JoinApplication, from: string, to: string): SendEmailCommandInput {
  const text = [
    "A new WhatsApp group application was submitted on aishipdie.com.",
    "",
    `Name: ${request.name}`,
    `WhatsApp: ${request.whatsapp_phone}`,
    "",
    "Background:",
    request.background
  ].join("\n");
  return {
    FromEmailAddress: `AI Ship or Die <${from}>`,
    Destination: { ToAddresses: [to] },
    Content: {
      Simple: {
        Subject: { Data: `New WhatsApp group application #${request.id}` },
        Body: { Text: { Charset: "UTF-8", Data: text } }
      }
    }
  };
}

export async function deliverJoinNotifications(
  db: Pick<Db, "connect">, send: (request: JoinApplication) => Promise<void>
): Promise<{ sent: number; deferred: number }> {
  const client = await db.connect();
  const result = { sent: 0, deferred: 0 };
  try {
    // Hold only the selected row while sending. Other workers skip it, and a
    // terminated worker automatically releases its claim for the next pass.
    while (result.sent + result.deferred < 25) {
      await client.query("begin");
      const pending = await client.query<JoinApplication>(`
        select id::text, name, whatsapp_phone, background from group_join_requests
        where notification_due_at <= now()
        order by notification_due_at, group_join_requests.id limit 1 for update skip locked
      `);
      const request = pending.rows[0];
      if (!request) {
        await client.query("commit");
        break;
      }
      let accepted = true;
      try {
        await send(request);
      } catch {
        accepted = false;
      }
      if (accepted) {
        await client.query(`update group_join_requests set
          notification_sent_at = clock_timestamp(), notification_due_at = null,
          notification_attempts = notification_attempts + 1 where id = $1`, [request.id]);
        result.sent++;
      } else {
        await client.query(`update group_join_requests set
          notification_due_at = clock_timestamp() + least(interval '1 hour', interval '1 minute' * power(2, least(notification_attempts, 6))),
          notification_attempts = notification_attempts + 1 where id = $1`, [request.id]);
        result.deferred++;
      }
      await client.query("commit");
    }
    return result;
  } finally {
    // Closing this connection also rolls back an interrupted delivery attempt.
    client.release(true);
  }
}
