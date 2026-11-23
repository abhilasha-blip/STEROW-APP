/**
 * Resets the backend's fixed TEST account (9999999999) so onboarding 1/3 → 2/3 → 3/3 can be QA'd again.
 * REFUSES any other account (checked before signing in, and again on the signed-in user's phone).
 *
 *   npx tsx scripts/reset-test-account.ts                       # dry run: shows what would be removed
 *   npx tsx scripts/reset-test-account.ts --yes                 # documents + vehicles
 *   npx tsx scripts/reset-test-account.ts --yes --include-dl    # also the driving licence (see WARNING)
 *
 * WARNING (backend bug, 2026-11-23): deleting the DL is a SOFT delete; the hidden row keeps the unique
 * user_id, and the RLS policy "Hide deleted rows" then blocks every later save (upsert → 42501, insert →
 * 23505) until the backend hard-deletes / restores the row. So the DL is only removed with --include-dl.
 *
 * Removes: (with --include-dl) the driving-licence row + its files (driving-licenses/<uid>/…), every vehicle document row
 * (RC / insurance / PUC / FASTag) + their files (vehicle-docs/<uid>/…). Vehicles CANNOT be deleted
 * (the backend answers "Vehicles cannot be deleted. Use ownership transfer instead."), so they are
 * deactivated (is_active=false): the app's routing only counts active vehicles. Their registration
 * numbers stay taken, so use a new vehicle number for each QA run.
 *
 * The app's local skip flags live in the simulator's Keychain:
 *   xcrun simctl keychain booted reset   (also signs the app out)
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { ENDPOINTS } from '../src/api/endpoints';

const TEST_PHONE = '9999999999';
const ROOT = path.resolve(__dirname, '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, process.env.ENV_FILE ?? '.env.development'), 'utf8')
    .split('\n')
    .map(l => l.match(/^\s*([\w.]+)\s*=\s*['"]?(.*?)['"]?\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => [m[1], m[2]]),
);
const { REST, STORAGE } = ENDPOINTS.SUPABASE;
const DOC_TABLES = [REST.VDOCS_RC, REST.VDOCS_INSURANCE, REST.VDOCS_POLLUTION, REST.VDOCS_FASTAG];
const apply = process.argv.includes('--yes');
const includeDl = process.argv.includes('--include-dl');

export function assertTestAccount(phone: string | undefined): void {
  if (phone !== TEST_PHONE) {
    throw new Error(`Refusing: this script only resets the fixed test account ${TEST_PHONE} (got ${phone ? 'another number' : 'none'}).`);
  }
}

async function postApp(p: string, body: unknown) {
  const res = await fetch(`${env.APP_API_BASE_URL}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { data?: Record<string, unknown> };
}

async function signIn(): Promise<{ sb: SupabaseClient; uid: string }> {
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
    throw error ?? new Error('sign-in failed');
  }
  return { sb, uid: data.user.id };
}

/** All object paths under <uid>/ in a bucket (one level of sub-folders, as the app writes them). */
async function listFiles(sb: SupabaseClient, bucket: string, uid: string): Promise<string[]> {
  const out: string[] = [];
  const top = await sb.storage.from(bucket).list(uid, { limit: 1000 });
  for (const entry of top.data ?? []) {
    if (entry.id) {
      out.push(`${uid}/${entry.name}`);
    } else {
      const sub = await sb.storage.from(bucket).list(`${uid}/${entry.name}`, { limit: 1000 });
      out.push(...(sub.data ?? []).filter(f => f.id).map(f => `${uid}/${entry.name}/${f.name}`));
    }
  }
  return out;
}

async function main() {
  assertTestAccount(env.TEST_PHONE);
  if (!env.TEST_OTP) {
    throw new Error('TEST_OTP is empty in .env.development');
  }
  const { sb, uid } = await signIn();
  const me = await sb.from(REST.USER_DETAILS).select('phone').eq('id', uid).single();
  assertTestAccount(me.data?.phone ?? undefined); // the signed-in user really is the test account

  const dl = await sb.from(REST.USER_DRIVING_LICENSES).select('id').eq('user_id', uid);
  const vehicles = await sb.from(REST.USER_VEHICLES).select('id,vehicle_number,is_active');
  const docs = await Promise.all(DOC_TABLES.map(t => sb.from(t).select('id')));
  const dlFiles = await listFiles(sb, STORAGE.DRIVING_LICENSES, uid);
  const docFiles = await listFiles(sb, STORAGE.VEHICLE_DOCS, uid);
  const activeVehicles = (vehicles.data ?? []).filter(v => v.is_active);

  console.log(`${apply ? 'Resetting' : 'DRY RUN (add --yes to apply)'}: test account ${TEST_PHONE}`);
  console.log(
    `  driving licence rows: ${dl.data?.length ?? 0}, files: ${dlFiles.length}` +
      (includeDl ? '  (WILL BE DELETED: see the warning in this script)' : '  (kept; --include-dl to delete)'),
  );
  DOC_TABLES.forEach((t, i) => console.log(`  ${t}: ${docs[i].data?.length ?? 0}`));
  console.log(`  vehicle-docs files: ${docFiles.length}`);
  console.log(`  vehicles: ${vehicles.data?.length ?? 0} (${activeVehicles.length} active → deactivate; can't be deleted)`);
  if (!apply) {
    await sb.auth.signOut({ scope: 'local' });
    return;
  }

  let failures = 0;
  const report = (what: string, error: { message: string } | null) => {
    console.log(`${error ? 'FAIL' : 'ok  '}  ${what}${error ? `: ${error.message}` : ''}`);
    failures += error ? 1 : 0;
  };
  for (const [i, table] of DOC_TABLES.entries()) {
    for (const row of docs[i].data ?? []) {
      report(`delete ${table} ${row.id}`, (await sb.from(table).delete().eq('id', row.id)).error);
    }
  }
  if (docFiles.length) {
    report(`remove ${docFiles.length} vehicle-docs file(s)`, (await sb.storage.from(STORAGE.VEHICLE_DOCS).remove(docFiles)).error);
  }
  for (const v of activeVehicles) {
    report(`deactivate vehicle ${v.vehicle_number}`, (await sb.from(REST.USER_VEHICLES).update({ is_active: false }).eq('id', v.id)).error);
  }
  for (const row of includeDl ? dl.data ?? [] : []) {
    report('delete driving licence row', (await sb.from(REST.USER_DRIVING_LICENSES).delete().eq('id', row.id)).error);
  }
  if (includeDl && dlFiles.length) {
    report(`remove ${dlFiles.length} driving-licenses file(s)`, (await sb.storage.from(STORAGE.DRIVING_LICENSES).remove(dlFiles)).error);
  }
  await sb.auth.signOut({ scope: 'local' });
  console.log(failures ? `${failures} step(s) failed` : 'Done. Also run: xcrun simctl keychain booted reset');
  process.exitCode = failures ? 1 : 0;
}

if (require.main === module) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  });
}
