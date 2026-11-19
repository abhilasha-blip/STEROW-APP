/**
 * Dev-only logger. Release builds log nothing.
 * Everything passes through `redact()`: tokens, OTPs, the apikey, hashes and full phone numbers
 * never reach the console.
 */
const SECRET_KEY = /token|otp|password|secret|apikey|authorization|hash|session|requestid/i;
const PHONE_KEY = /phone|mobile/i;
const JWT = /eyJ[\w-]+\.[\w-]+\.[\w-]*/g;
const LONG_DIGITS = /\d{6,}/g;

const maskDigits = (s: string) => s.replace(LONG_DIGITS, d => `${'*'.repeat(d.length - 2)}${d.slice(-2)}`);

export function redact(value: unknown, key = '', depth = 0): unknown {
  if (depth > 6) {
    return '[…]';
  }
  if (Array.isArray(value)) {
    return value.map(v => redact(v, key, depth + 1));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, redact(v, k, depth + 1)]),
    );
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const s = String(value);
    if (SECRET_KEY.test(key)) {
      return '[REDACTED]';
    }
    if (PHONE_KEY.test(key)) {
      return maskDigits(s);
    }
    return typeof value === 'string' ? maskDigits(s.replace(JWT, '[JWT]')) : value;
  }
  return value;
}

type Level = 'debug' | 'info' | 'warn' | 'error';

function emit(level: Level, message: string, data?: unknown) {
  if (!__DEV__) {
    return;
  }
  const args: unknown[] = [`[sterow] ${redact(message)}`];
  if (data !== undefined) {
    args.push(redact(data));
  }
   
  console[level === 'debug' ? 'log' : level](...args);
}

export const logger = {
  debug: (message: string, data?: unknown) => emit('debug', message, data),
  info: (message: string, data?: unknown) => emit('info', message, data),
  warn: (message: string, data?: unknown) => emit('warn', message, data),
  error: (message: string, data?: unknown) => emit('error', message, data),
};
