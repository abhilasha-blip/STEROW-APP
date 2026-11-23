/**
 * READ-ONLY live probe of the phase 1 onboarding APIs with the backend's fixed test login
 * (TEST_PHONE=9999999999 + TEST_OTP, no SMS). Writes nothing to the backend.
 *
 *   npx tsx scripts/smoke-onboarding.ts
 *
 * Signs in (otp/request → otp/verify → setSession), then reads what the onboarding screens and the
 * post-login routing read: user_details, user_driving_licenses, the user_vehicles count, the vehicle
 * master data and one row of each vehicle-document table. Prints PASS/FAIL per step and writes
 * REDACTED shapes to docs/api/examples/onboarding.*.json. Signs out locally at the end.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENDPOINTS } from '../src/api/endpoints';

const ROOT = path.resolve(__dirname, '..');
const EXAMPLES_DIR = path.join(ROOT, 'docs/api/examples');

function readEnv(file: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of fs.readFileSync(path.join(ROOT, file), 'utf8').split('\n')) {
    const m = line.match(/^\s*([\w.]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
    if (m && !line.trim().startsWith('#')) {
      out[m[1]] = m[2];
    }
  }
  return out;
}
const env = readEnv(process.env.ENV_FILE ?? '.env.development');
const APP = env.APP_API_BASE_URL;
const PHONE = env.TEST_PHONE;
const OTP = env.TEST_OTP;
if (PHONE !== '9999999999' || !OTP) {
  throw new Error('This probe only runs with the fixed test login (TEST_PHONE=9999999999 and TEST_OTP).');
}

const SECRET = /token|secret|password|otp|apikey|authorization/i;
const PII_KEYS = /phone|mobile|email|full_name|dl_number|address|chassis|engine|vehicle_number|registration_number|rc_number|policy_no|certificate_no/i;
function redact(value: unknown, key = ''): unknown {
  if (Array.isArray(value)) {
    return value.slice(0, 3).map(v => redact(v, key));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, redact(v, k)]));
  }
  if (typeof value === 'string' && (SECRET.test(key) || PII_KEYS.test(key))) {
    return `<redacted ${key}, ${value.length} chars>`;
  }
  return value;
}
const save = (name: string, data: unknown) => {
  fs.mkdirSync(EXAMPLES_DIR, { recursive: true });
  fs.writeFileSync(path.join(EXAMPLES_DIR, `onboarding.${name}.json`), JSON.stringify(redact(data), null, 2) + '\n');
};

let failures = 0;
async function step<T>(name: string, fn: () => Promise<T>): Promise<T | undefined> {
  try {
    const r = await fn();
    console.log(`PASS  ${name}`);
    return r;
  } catch (e) {
    failures++;
    console.log(`FAIL  ${name}: ${e instanceof Error ? e.message : JSON.stringify(e)}`);
    return undefined;
  }
}

async function postApp(p: string, body: unknown) {
  const res = await fetch(`${APP}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as { data?: Record<string, unknown> } };
}

async function signIn(): Promise<SupabaseClient> {
  const req = await postApp(ENDPOINTS.APP.AUTH.OTP_REQUEST, { phone: PHONE, purpose: 'signin' });
  const requestId = req.json.data?.requestId;
  if (typeof requestId !== 'string') {
    throw new Error(`otp/request HTTP ${req.status}`);
  }
  const ver = await postApp(ENDPOINTS.APP.AUTH.OTP_VERIFY, { requestId, otp: OTP, purpose: 'signin' });
  const d = ver.json.data;
  if (typeof d?.access_token !== 'string' || typeof d.refresh_token !== 'string') {
    throw new Error(`otp/verify HTTP ${ver.status}`);
  }
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { error } = await sb.auth.setSession({ access_token: d.access_token, refresh_token: d.refresh_token });
  if (error) {
    throw error;
  }
  return sb;
}

async function main() {
  const sb = await step('sign in (fixed test login)', signIn);
  if (!sb) {
    process.exitCode = 1;
    return;
  }
  const uid = (await sb.auth.getUser()).data.user?.id ?? '';
  const { REST } = ENDPOINTS.SUPABASE;
  const read = async (name: string, q: PromiseLike<{ data: unknown; error: unknown; count?: number | null }>) =>
    step(name, async () => {
      const r = await q;
      if (r.error) {
        throw new Error(JSON.stringify(r.error));
      }
      save(name, { count: r.count ?? null, data: r.data });
      const rows = Array.isArray(r.data) ? r.data : r.data ? [r.data] : [];
      const cols = rows[0] && typeof rows[0] === 'object' ? Object.keys(rows[0] as object).join(', ') : '(no rows)';
      console.log(`      rows=${rows.length} count=${r.count ?? '–'} columns: ${cols}`);
      return r;
    });

  await read('user_details', sb.from(REST.USER_DETAILS).select('*').eq('id', uid));
  await read('user_driving_licenses', sb.from(REST.USER_DRIVING_LICENSES).select('*').eq('user_id', uid));
  await read('user_vehicles.count', sb.from(REST.USER_VEHICLES).select('id', { count: 'exact', head: true }));
  await read('user_vehicles', sb.from(REST.USER_VEHICLES).select('*').limit(2));
  await read('vehicle_make_master', sb.from(REST.VEHICLE_MAKES).select('*', { count: 'exact' }).order('name').limit(3));
  await read('vehicle_model_master', sb.from(REST.VEHICLE_MODELS).select('*', { count: 'exact' }).order('name').limit(3));
  await read(
    'vehicle_variant_master',
    sb.from(REST.VEHICLE_VARIANTS).select('*', { count: 'exact' }).order('variant_name').limit(3),
  );
  for (const table of [REST.VDOCS_RC, REST.VDOCS_INSURANCE, REST.VDOCS_POLLUTION]) {
    await read(table, sb.from(table).select('*', { count: 'exact' }).limit(1));
  }
  await sb.auth.signOut({ scope: 'local' });
  console.log(failures ? `\n${failures} step(s) failed` : '\nAll reads passed (nothing was written).');
  process.exitCode = failures ? 1 : 0;
}

main();
