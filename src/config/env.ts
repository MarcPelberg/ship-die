import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  DATABASE_URL: z.string().min(1),
  PORT: z.coerce.number().int().positive().default(3000),
  PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  ADMIN_TOKEN: z.string().min(8).default("local-development-token"),
  DEEPSEEK_API_KEY: z.string().default(""),
  DEEPSEEK_MODEL: z.string().default("deepseek-v4-flash"),
  DEEPSEEK_STRONG_MODEL: z.string().default("deepseek-v4-pro"),
  WHATSAPP_GROUP_JID: z.string().default(""),
  WHATSAPP_AUTH_DIR: z.string().default(".data/wa-auth")
});

export type AppEnv = {
  databaseUrl: string;
  port: number;
  publicBaseUrl: string;
  adminToken: string;
  deepseekApiKey: string;
  deepseekModel: string;
  deepseekStrongModel: string;
  whatsappGroupJid: string;
  whatsappAuthDir: string;
};

export function parseEnv(input: NodeJS.ProcessEnv): AppEnv {
  const parsed = EnvSchema.parse(input);
  return {
    databaseUrl: parsed.DATABASE_URL,
    port: parsed.PORT,
    publicBaseUrl: parsed.PUBLIC_BASE_URL,
    adminToken: parsed.ADMIN_TOKEN,
    deepseekApiKey: parsed.DEEPSEEK_API_KEY,
    deepseekModel: parsed.DEEPSEEK_MODEL,
    deepseekStrongModel: parsed.DEEPSEEK_STRONG_MODEL,
    whatsappGroupJid: parsed.WHATSAPP_GROUP_JID,
    whatsappAuthDir: parsed.WHATSAPP_AUTH_DIR
  };
}

export const env =
  process.env.NODE_ENV === "test" ? ({} as AppEnv) : parseEnv(process.env);
