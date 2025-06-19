import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BLOB_READ_WRITE_TOKEN: z.string(),
    GROQ_API_KEY: z.string(), // Adicionado aqui
    ZAPI_INSTANCE_ID: z.string().optional(),
    ZAPI_TOKEN: z.string().optional(),
    ZAPI_CLIENT_TOKEN: z.string().optional(),
  },
  client: {
    // Variáveis expostas ao cliente, se houver
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN, // Adicionado aqui
    GROQ_API_KEY: process.env.GROQ_API_KEY, // Adicionado aqui
    ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID,
    ZAPI_TOKEN: process.env.ZAPI_TOKEN,
    ZAPI_CLIENT_TOKEN: process.env.ZAPI_CLIENT_TOKEN,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
});
