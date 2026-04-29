import { env } from "../src/config/env.js";

async function main(): Promise<void> {
  const response = await fetch(`${env.publicBaseUrl}/healthz`);
  if (!response.ok) {
    throw new Error(`healthz failed with HTTP ${response.status}`);
  }

  const body = await response.json() as { ok?: unknown };
  if (body.ok !== true) {
    throw new Error("healthz returned an unexpected body");
  }

  console.log("smoke ok");
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
