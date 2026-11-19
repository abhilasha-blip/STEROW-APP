import Config from 'react-native-config';
import { z } from 'zod';

/**
 * Typed, validated build-time configuration (react-native-config).
 * Debug builds read .env.development, Release builds read .env.production.
 * TEST_OTP is deliberately NOT read here: it is for scripts/smoke-auth.ts only.
 */
const EnvSchema = z.object({
  APP_API_BASE_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_URL: z.url({ protocol: /^https$/ }),
  SUPABASE_ANON_KEY: z.string().min(1),
  TEST_PHONE: z.string().optional(),
});

export type Env = Readonly<{
  APP_API_BASE_URL: string;
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  /** Dev builds only; always undefined in release builds. */
  TEST_PHONE?: string;
}>;

export class EnvError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvError';
  }
}

export function parseEnv(raw: Record<string, string | undefined>, isDev: boolean): Env {
  const result = EnvSchema.safeParse(raw);
  if (!result.success) {
    const problems = result.error.issues
      .map(i => `${i.path.join('.') || '(root)'}: ${raw[String(i.path[0])] ? 'invalid' : 'missing'}`)
      .join(', ');
    throw new EnvError(
      `Invalid app configuration (${problems}). Check the .env file for this build type; see .env.example.`,
    );
  }
  const { APP_API_BASE_URL, SUPABASE_URL, SUPABASE_ANON_KEY, TEST_PHONE } = result.data;
  return Object.freeze({
    APP_API_BASE_URL: APP_API_BASE_URL.replace(/\/+$/, ''),
    SUPABASE_URL: SUPABASE_URL.replace(/\/+$/, ''),
    SUPABASE_ANON_KEY,
    TEST_PHONE: isDev && TEST_PHONE ? TEST_PHONE : undefined,
  });
}

let cached: Env | undefined;

/** Lazily parsed so a bad config throws a clear error at first use, not at import time in tests. */
export function getEnv(): Env {
  if (!cached) {
    cached = parseEnv(
      {
        APP_API_BASE_URL: Config.APP_API_BASE_URL,
        SUPABASE_URL: Config.SUPABASE_URL,
        SUPABASE_ANON_KEY: Config.SUPABASE_ANON_KEY,
        TEST_PHONE: Config.TEST_PHONE,
      },
      __DEV__,
    );
  }
  return cached;
}
