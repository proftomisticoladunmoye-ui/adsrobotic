import { z } from 'zod';

/**
 * Centralized, validated environment schema (Spec §18, §21, §27).
 * Channel connector secrets are optional in the MVP and validated lazily when
 * their adapter is actually connected (Spec §4).
 */
const serverEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  // Core
  NEXT_PUBLIC_APP_URL: z.string().url().default('http://localhost:3000'),

  // Database
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  DIRECT_URL: z.string().optional(),

  // Redis
  REDIS_URL: z.string().min(1, 'REDIS_URL is required').default('redis://localhost:6379'),

  // Security (Spec §21)
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  TOKEN_ENCRYPTION_KEY: z
    .string()
    .min(1, 'TOKEN_ENCRYPTION_KEY is required for encrypting channel OAuth tokens at rest'),

  // Object storage (optional until creative/landing-page asset features land)
  OBJECT_STORAGE_ENDPOINT: z.string().optional(),
  OBJECT_STORAGE_BUCKET: z.string().optional(),
  OBJECT_STORAGE_KEY: z.string().optional(),
  OBJECT_STORAGE_SECRET: z.string().optional(),

  // AI orchestration layer (Spec §18). Provider-agnostic; `local` needs no key
  // and makes no external calls. `claude` / `openrouter` are config-gated.
  AI_PROVIDER: z.enum(['local', 'claude', 'openrouter']).default('local'),
  AI_API_KEY: z.string().optional(),
  AI_MODEL: z.string().default('claude-opus-5'),
  AI_BASE_URL: z.string().url().optional(),

  // Image generation for creative visuals (Spec §3). `local` renders an on-brand
  // SVG poster with no external call; `openai` calls a real image API (OpenAI or
  // any OpenAI-compatible gateway via IMAGE_BASE_URL).
  IMAGE_PROVIDER: z.enum(['local', 'openai']).default('local'),
  IMAGE_API_KEY: z.string().optional(),
  IMAGE_MODEL: z.string().default('gpt-image-1'),
  IMAGE_BASE_URL: z.string().url().optional(),

  // Advertising channel connectors (Spec §4) — optional until connected.
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z.string().optional(),
  GOOGLE_ADS_API_VERSION: z.string().default('v18'),
  META_ADS_APP_ID: z.string().optional(),
  META_ADS_APP_SECRET: z.string().optional(),
  META_GRAPH_VERSION: z.string().default('v21.0'),

  // TikTok Business (Marketing) API
  TIKTOK_APP_ID: z.string().optional(),
  TIKTOK_APP_SECRET: z.string().optional(),
  TIKTOK_API_VERSION: z.string().default('v1.3'),

  // WhatsApp Business lead destination (Spec §5)
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | null = null;

/**
 * Parse and cache server environment. Throws a readable error listing every
 * invalid/missing variable. Call this once at process startup.
 */
export function loadServerEnv(source: NodeJS.ProcessEnv = process.env): ServerEnv {
  if (cached) return cached;
  const parsed = serverEnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}

/** For tests: reset the memoized env. */
export function resetServerEnvCache(): void {
  cached = null;
}
