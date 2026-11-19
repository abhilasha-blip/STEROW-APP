/**
 * Live auth smoke test against the PUBLIC STEROW API. Sends AT MOST ONE real SMS per run.
 *
 * Two non-interactive phases (works with Claude Code's `!` prefix, which has no stdin):
 *   npm run smoke:auth -- request [--send]  # stores requestId in the OS temp dir
 *   npm run smoke:auth -- verify [code]     # verifies with the stored requestId
 *
 * Backend fixed test login (no real SMS): phone 9999999999 + TEST_OTP. For that number the request
 * is sent without --send and `verify` with no code uses TEST_OTP. Any other number is a real, paid
 * SMS: it needs --send, once per run.
 *   ENV_FILE=.env.staging npm run smoke:auth -- …
 *
 * Flow: otp/request (purpose=signin, TEST_PHONE) → otp/verify →
 * (tokenHash → Supabase verifyOtp) → user, user_details, user_roles, my_permissions → local sign-out.
 * Prints PASS/FAIL per step and writes REDACTED response shapes to docs/api/examples/.
 * No retries: a failed request is reported, never resent.
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createClient, type Session } from '@supabase/supabase-js';
import { ENDPOINTS } from '../src/api/endpoints';

const ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(ROOT, 'docs/api/examples');
const STATE_FILE = path.join(os.tmpdir(), 'sterow-smoke-auth.json');

// ---------- env ----------
function readEnv(file: string): Record<string, string> {
  const full = path.join(ROOT, file);
  if (!fs.existsSync(full)) {
    throw new Error(`Missing ${file}`);
  }
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(full, 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
    if (m && !line.trim().startsWith('#')) {
      out[m[1]] = m[2];
    }
  }
  return out;
}
const env = readEnv(process.env.ENV_FILE ?? '.env.development');
const need = (k: string) => {
  const v = env[k];
  if (!v) {
    throw new Error(`${k} is empty in ${process.env.ENV_FILE ?? '.env.development'}`);
  }
  return v;
};
const APP = need('APP_API_BASE_URL');
const SB_URL = need('SUPABASE_URL');
const SB_KEY = need('SUPABASE_ANON_KEY');
const PHONE = need('TEST_PHONE');
/** Backend's fixed test login: never sends an SMS. */
const FIXED_TEST_PHONE = '9999999999';
const isFixedTestPhone = PHONE === FIXED_TEST_PHONE;
const TEST_OTP = env.TEST_OTP ?? '';
if (!/^[6-9]\d{9}$/.test(PHONE)) {
  throw new Error('TEST_PHONE must be 10 digits starting with 6-9 (no +91)');
}

// ---------- redaction ----------
const SECRET_KEYS = /token|hash|secret|password|otp|apikey|authorization|code_verifier/i;
const PHONE_KEYS = /phone|mobile/i;
const EMAIL_KEYS = /^email$/i;
const maskPhone = (v: string) => v.replace(/\d(?=\d{4})/g, 'X');
function redact(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 3).map(v => redact(v, key));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  if (typeof value === 'string') {
    if (SECRET_KEYS.test(key)) {
      return `<redacted string, ${value.length} chars>`;
    }
    if (PHONE_KEYS.test(key)) {
      return maskPhone(value);
    }
    if (EMAIL_KEYS.test(key) || value.includes('@phone.local')) {
      return value.replace(/\d(?=\d{4})/g, 'X');
    }
    if (/^eyJ/.test(value)) {
      return `<redacted jwt, ${value.length} chars>`;
    }
  }
  return value;
}
const save = (name: string, data: unknown) => {
  fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
  fs.writeFileSync(path.join(EXAMPLES_DIR, `${name}.json`), JSON.stringify(redact(data), null, 2) + '\n');
};

// ---------- reporting ----------
let failures = 0;
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  const t0 = Date.now();
  try {
    const r = await fn();
    console.log(`PASS  ${name}  (${Date.now() - t0} ms)`);
    return r;
  } catch (e) {
    failures++;
    const msg = e instanceof Error ? e.message : JSON.stringify(redact(e));
    console.log(`FAIL  ${name}  (${Date.now() - t0} ms): ${msg}`);
    return undefined;
  }
}

async function postApp(p: string, body: unknown) {
  const res = await fetch(`${APP}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep raw text
  }
  return { status: res.status, json };
}

async function requestPhase() {
  console.log(
    `Target: ${APP}  phone: ${maskPhone(PHONE)}  purpose: signin` +
      (isFixedTestPhone ? '  (fixed test login, no SMS)' : '  (REAL SMS)'),
  );
  if (!isFixedTestPhone && !process.argv.includes('--send')) {
    console.log('Dry run: nothing sent. Re-run with `request --send` to send ONE real SMS.');
    return;
  }
  // Phone as 10 digits (what the web sends).
  const request = await step('otp/request (signin, 10-digit phone)', async () => {
    const r = await postApp(ENDPOINTS.APP.AUTH.OTP_REQUEST, { phone: PHONE, purpose: 'signin' });
    save(r.status === 200 ? 'otp-request.signin.response' : 'otp-request.signin.last-error', {
      status: r.status,
      body: r.json,
    });
    console.log('      →', JSON.stringify(redact(r.json)));
    if (r.status !== 200) {
      throw new Error(`HTTP ${r.status}`);
    }
    return r.json as { data?: { requestId?: string } };
  });
  const requestId = request?.data?.requestId;
  if (!requestId) {
    console.log('No requestId in response; stopping (no retry, no further SMS).');
    process.exitCode = 1;
    return;
  }
  fs.writeFileSync(STATE_FILE, JSON.stringify({ requestId, at: Date.now() }), { mode: 0o600 });
  console.log('Now run: npm run smoke:auth -- verify <6-digit code>');
}

async function verifyPhase(otp: string) {
  if (!/^\d{6}$/.test(otp)) {
    throw new Error('Usage: verify <6-digit code> (or set TEST_OTP for the fixed test number)');
  }
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('No stored requestId. Run `request --send` first.');
  }
  const { requestId } = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as { requestId: string };

  // 2) Verify.
  const verify = await step('otp/verify', async () => {
    const r = await postApp(ENDPOINTS.APP.AUTH.OTP_VERIFY, { requestId, otp, purpose: 'signin' });
    save(r.status === 200 ? 'otp-verify.signin.response' : 'otp-verify.signin.last-error', {
      status: r.status,
      body: r.json,
    });
    console.log('      →', JSON.stringify(redact(r.json)));
    if (r.status !== 200) {
      throw new Error(`HTTP ${r.status}`);
    }
    return r.json as { data?: Record<string, unknown> };
  });
  const data = verify?.data;
  if (!data) {
    process.exitCode = 1;
    return;
  }

  // 3) Session: either returned directly or via tokenHash exchange.
  const supabase = createClient(SB_URL, SB_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  let session: Session | null = null;
  if (typeof data.tokenHash === 'string') {
    session =
      (await step('supabase verifyOtp(token_hash, magiclink) → session', async () => {
        const { data: d, error } = await supabase.auth.verifyOtp({
          token_hash: data.tokenHash as string,
          type: 'magiclink',
        });
        if (error || !d.session) {
          throw error ?? new Error('no session');
        }
        save('session.from-token-hash', d.session);
        return d.session;
      })) ?? null;
  } else if (typeof data.access_token === 'string' && typeof data.refresh_token === 'string') {
    session =
      (await step('supabase setSession(returned tokens)', async () => {
        const { data: d, error } = await supabase.auth.setSession({
          access_token: data.access_token as string,
          refresh_token: data.refresh_token as string,
        });
        if (error || !d.session) {
          throw error ?? new Error('no session');
        }
        save('session.from-verify', d.session);
        return d.session;
      })) ?? null;
  } else {
    console.log('FAIL  verify returned neither tokenHash nor a session; keys:', Object.keys(data));
    failures++;
  }

  if (session) {
    const uid = session.user.id;
    await step('auth user', async () => {
      const { data: d, error } = await supabase.auth.getUser();
      if (error) {
        throw error;
      }
      save('auth-user', d.user);
    });
    await step('user_details', async () => {
      const { data: d, error } = await supabase
        .from(ENDPOINTS.SUPABASE.REST.USER_DETAILS)
        .select('*')
        .eq('id', uid); // user_details.id = auth uid (no user_id column, despite the Swagger text)
      if (error) {
        throw error;
      }
      save('user_details', d);
      if (d.length !== 1) {
        throw new Error(`expected 1 row for id=uid, got ${d.length}`);
      }
    });
    await step('user_roles (select=roles(name))', async () => {
      const { data: d, error } = await supabase
        .from(ENDPOINTS.SUPABASE.REST.USER_ROLES)
        .select('roles(name)')
        .eq('user_id', uid);
      if (error) {
        throw error;
      }
      save('user_roles', d);
    });
    await step('rpc my_permissions', async () => {
      const { data: d, error } = await supabase.rpc(ENDPOINTS.SUPABASE.RPC.MY_PERMISSIONS);
      if (error) {
        throw error;
      }
      save('my_permissions', d);
    });
    await step('signOut (local)', async () => {
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) {
        throw error;
      }
    });
  }

  fs.rmSync(STATE_FILE, { force: true });
  console.log(failures ? `\n${failures} step(s) FAILED` : '\nALL PASS');
  console.log(`Redacted shapes written to ${path.relative(ROOT, EXAMPLES_DIR)}/`);
  process.exitCode = failures ? 1 : 0;
}

async function main() {
  const [phase, arg] = process.argv.slice(2);
  if (phase === 'request') {
    return requestPhase();
  }
  if (phase === 'verify') {
    const code = (arg ?? '').trim() || (isFixedTestPhone ? TEST_OTP : '');
    return verifyPhase(code);
  }
  console.log('Usage: npm run smoke:auth -- request [--send] | verify [code]');
}

main().catch(e => {
  console.error('FATAL', e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
