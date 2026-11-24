/**
 * READ-ONLY live probe of the columns the dashboard counts and Share Access filter on, with the backend's
 * fixed test login (TEST_PHONE=9999999999 + TEST_OTP, no SMS). Only SELECT / HEAD requests; writes nothing.
 *
 *   npx tsx scripts/probe-bookings-shares.ts
 *
 * Checks that service_bookings.customer_id / status and vehicle_shares.owner_id / is_active exist
 * (PostgREST answers 42703 for an unknown column), and how many rows the test user has. Prints counts
 * and column names only (no row values).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ENDPOINTS } from '../src/api/endpoints';

const ROOT = path.resolve(__dirname, '..');
const env: Record<string, string> = {};
for (const line of fs.readFileSync(path.join(ROOT, process.env.ENV_FILE ?? '.env.development'), 'utf8').split('\n')) {
  const m = line.match(/^\s*([\w.]+)\s*=\s*['"]?(.*?)['"]?\s*$/);
  if (m && !line.trim().startsWith('#')) {
    env[m[1]] = m[2];
  }
}
if (env.TEST_PHONE !== '9999999999' || !env.TEST_OTP) {
  throw new Error('This probe only runs with the fixed test login (TEST_PHONE=9999999999).');
}
const { REST } = ENDPOINTS.SUPABASE;

async function postApp(p: string, body: object) {
  const res = await fetch(`${env.APP_API_BASE_URL}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { data?: Record<string, unknown> };
}

async function main() {
  const req = await postApp(ENDPOINTS.APP.AUTH.OTP_REQUEST, { phone: env.TEST_PHONE, purpose: 'signin' });
  const ver = await postApp(ENDPOINTS.APP.AUTH.OTP_VERIFY, { requestId: req.data?.requestId, otp: env.TEST_OTP, purpose: 'signin' });
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.setSession({
    access_token: String(ver.data?.access_token),
    refresh_token: String(ver.data?.refresh_token),
  });
  if (error || !data.user) {
    throw error ?? new Error('no user');
  }
  const uid = data.user.id;
  const count = async (label: string, q: PromiseLike<{ count: number | null; error: { code?: string; message: string } | null }>) => {
    const r = await q;
    console.log(`${label}: ${r.error ? `ERROR ${r.error.code} ${r.error.message}` : `count=${r.count}`}`);
  };
  const head = (t: string) => sb.from(t).select('id', { count: 'exact', head: true });

  // Control: an unknown column must fail, or the checks below prove nothing.
  await count('CONTROL service_bookings not_a_column=uid (expect ERROR)', head(REST.SERVICE_BOOKINGS).eq('not_a_column', uid));
  await count('CONTROL GET not_a_column (expect ERROR)', sb.from(REST.SERVICE_BOOKINGS).select('id', { count: 'exact' }).eq('not_a_column', uid).limit(1));
  await count('service_bookings GET customer_id=uid', sb.from(REST.SERVICE_BOOKINGS).select('id,customer_id,status', { count: 'exact' }).eq('customer_id', uid).limit(1));
  await count('vehicle_shares GET owner_id=uid', sb.from(REST.VEHICLE_SHARES).select('id,owner_id,vehicle_id,member_user_id,member_phone,member_name,member_role,status,is_active', { count: 'exact' }).eq('owner_id', uid).limit(1));
  await count('service_bookings visible (RLS)', head(REST.SERVICE_BOOKINGS));
  await count('service_bookings customer_id=uid', head(REST.SERVICE_BOOKINGS).eq('customer_id', uid));
  await count('service_bookings status=in.(delivered)', head(REST.SERVICE_BOOKINGS).eq('customer_id', uid).in('status', ['delivered']));
  await count('vehicle_shares visible (RLS)', head(REST.VEHICLE_SHARES));
  await count('vehicle_shares owner_id=uid,is_active', head(REST.VEHICLE_SHARES).eq('owner_id', uid).eq('is_active', true));
  await count('vehicle_shares member_user_id,member_phone,member_name,member_role,status', sb.from(REST.VEHICLE_SHARES).select('member_user_id,member_phone,member_name,member_role,status', { count: 'exact', head: true }));
  // Column list of one visible booking (names only), to compare with the web's customer_id.
  const one = await sb.from(REST.SERVICE_BOOKINGS).select('*').limit(1);
  console.log('service_bookings columns:', one.error ? `ERROR ${one.error.code}` : Object.keys(one.data?.[0] ?? {}).join(',') || '(no visible row)');
  const own = one.data?.[0] as Record<string, unknown> | undefined;
  if (own) {
    console.log('first visible booking: customer_id === uid ?', own.customer_id === uid);
  }
  await sb.auth.signOut({ scope: 'local' });
}

main().catch(e => {
  console.error('FAILED', e instanceof Error ? e.message : e);
  process.exit(1);
});
