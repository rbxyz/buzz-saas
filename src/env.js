import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod"

export const env = createEnv({
  server: {
    DATABASE_URL: z.string().url(),
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    BLOB_READ_WRITE_TOKEN: z.string(),
    GROQ_API_KEY: z.string(),
    ZAPI_INSTANCE_ID: z.string().min(1, "ZAPI_INSTANCE_ID é obrigatório"),
    ZAPI_TOKEN: z.string().min(1, "ZAPI_TOKEN é obrigatório"),
    ZAPI_CLIENT_TOKEN: z.string().min(1, "ZAPI_CLIENT_TOKEN é obrigatório"),
    // Variáveis do Vercel (server-side apenas)
    VERCEL_URL: z.string().optional(),
    APP_URL: z.string().url().optional(),
  },
  client: {
    // Variáveis expostas ao cliente
    NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  },
  runtimeEnv: {
    DATABASE_URL: process.env.DATABASE_URL,
    NODE_ENV: process.env.NODE_ENV,
    BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN,
    GROQ_API_KEY: process.env.GROQ_API_KEY,
    ZAPI_INSTANCE_ID: process.env.ZAPI_INSTANCE_ID,
    ZAPI_TOKEN: process.env.ZAPI_TOKEN,
    ZAPI_CLIENT_TOKEN: process.env.ZAPI_CLIENT_TOKEN,
    VERCEL_URL: process.env.VERCEL_URL,
    APP_URL: process.env.APP_URL,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,
  emptyStringAsUndefined: true,
})
