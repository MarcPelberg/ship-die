import { SESv2Client, SendEmailCommand } from "@aws-sdk/client-sesv2";
import pg from "pg";
import { z } from "zod";
import { deliverJoinNotifications, joinEmail } from "./join-notifications.js";

async function main(): Promise<void> {
  const config = z.object({
    DATABASE_URL: z.string().min(1),
    AWS_REGION: z.literal("us-east-1"),
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    JOIN_NOTIFY_FROM: z.string().email(),
    JOIN_NOTIFY_TO: z.string().email()
  }).parse(process.env);
  const db = new pg.Pool({ connectionString: config.DATABASE_URL, max: 1 });
  const ses = new SESv2Client({
    region: config.AWS_REGION,
    credentials: {
      accessKeyId: config.AWS_ACCESS_KEY_ID, secretAccessKey: config.AWS_SECRET_ACCESS_KEY
    },
    // SES SendEmail has no idempotency token. Retries belong to the durable queue.
    maxAttempts: 1
  });
  try {
    const result = await deliverJoinNotifications(db, async request => {
      const command = new SendEmailCommand(joinEmail(request, config.JOIN_NOTIFY_FROM, config.JOIN_NOTIFY_TO));
      const response = await ses.send(command, { abortSignal: AbortSignal.timeout(15000) });
      if (!response.MessageId) throw new Error("Missing delivery acknowledgement");
    });
    if (result.sent) console.info("Join notifications accepted:", result.sent);
    if (result.deferred) console.warn("Join notifications queued for retry:", result.deferred);
  } finally {
    ses.destroy();
    await db.end();
  }
}

main().catch(() => {
  console.error("Join notifier could not complete its run. Check its private configuration and database connection.");
  process.exitCode = 1;
});
