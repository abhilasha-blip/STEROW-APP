/**
 * LIVE QA of onboarding 3/3 on the demo backend, fixed test login 9999999999 ONLY.
 * Sends exactly what the app sends (shapes pinned by documentsStep.api.test.tsx / vehicleDocuments tests):
 *
 *   npx tsx scripts/live-documents.ts <VEHICLE_NUMBER>   # e.g. TS00QA0001 (must be unused: numbers are unique)
 *
 * 1. the minimal user_vehicles row (first active variant; fuel/transmission from it; rc_number = number;
 *    current_odometer 0; entry_method manual)
 * 2. RC, Insurance, Pollution and FASTag: file → vehicle-docs/<uid>/<table>/<uuid>.<ext>, then the row
 * 3. reads everything back (rows + signed URLs) and checks the routing count (active vehicles = 1)
 * Clean up afterwards with scripts/reset-test-account.ts --yes (vehicles can only be deactivated).
 */
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ENDPOINTS, STORAGE_PATHS } from '../src/api/endpoints';

const ROOT = path.resolve(__dirname, '..');
const env = Object.fromEntries(
  fs
    .readFileSync(path.join(ROOT, '.env.development'), 'utf8')
    .split('\n')
    .map(l => l.match(/^\s*([\w.]+)\s*=\s*['"]?(.*?)['"]?\s*$/))
    .filter((m): m is RegExpMatchArray => !!m)
    .map(m => [m[1], m[2]]),
);
if (env.TEST_PHONE !== '9999999999' || !env.TEST_OTP) {
  throw new Error('Live writes are allowed with the fixed test login only (TEST_PHONE=9999999999).');
}
const NUMBER = (process.argv[2] ?? '').toUpperCase();
if (!/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{4}$/.test(NUMBER)) {
  throw new Error('Usage: live-documents.ts <VEHICLE_NUMBER> (e.g. TS00QA0001)');
}
const { REST, STORAGE } = ENDPOINTS.SUPABASE;
const RC_FILE = path.join(ROOT, 'design/onboarding/sample-rc.png');

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  failures += ok ? 0 : 1;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};

async function postApp(p: string, body: unknown) {
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
  const { data: auth } = await sb.auth.setSession({
    access_token: String(ver.data?.access_token),
    refresh_token: String(ver.data?.refresh_token),
  });
  const uid = auth.user!.id;

  // Model picker data (as vehicleMaster.service): the first active variant with its model + make.
  const variant = (await sb.from(REST.VEHICLE_VARIANTS).select('id,variant_name,model_id,fuel_type,transmission_type,is_active')).data?.find(
    v => v.is_active !== false,
  );
  const model = (await sb.from(REST.VEHICLE_MODELS).select('id,name,make_id').eq('id', variant!.model_id).single()).data!;
  console.log(`model picked: ${variant!.variant_name} (${variant!.fuel_type}, ${variant!.transmission_type})`);

  const vehicleRow = {
    vehicle_number: NUMBER,
    make_id: model.make_id,
    model_id: model.id,
    variant_id: variant!.id,
    fuel_type: variant!.fuel_type ?? 'Petrol',
    transmission_type: variant!.transmission_type ?? 'Manual',
    rc_number: NUMBER,
    current_odometer: 0,
    entry_method: 'manual',
  };
  const v = await sb.from(REST.USER_VEHICLES).insert(vehicleRow).select('id').single();
  check('create the minimal vehicle', !v.error, v.error ? `${v.error.code} ${v.error.message}` : '');
  if (v.error) {
    process.exitCode = 1;
    return;
  }
  const vehicleId = v.data.id as string;
  const base = { vehicle_id: vehicleId, registration_number: NUMBER };
  const links = { make_id: model.make_id, model_id: model.id, variant_id: variant!.id };
  const docs: [string, Record<string, unknown>][] = [
    [REST.VDOCS_RC, { ...base, ...links }],
    [REST.VDOCS_INSURANCE, { ...base, ...links, policy_no: 'QA-POLICY-1', insurer: 'QA Insurer' }],
    [REST.VDOCS_POLLUTION, { ...base, certificate_no: 'QA-PUC-1' }],
    [REST.VDOCS_FASTAG, { ...base, fastag_id: 'QA-FASTAG-1' }],
  ];
  for (const [table, row] of docs) {
    const objectPath = STORAGE_PATHS.vehicleDocument(uid, table, crypto.randomUUID(), 'png');
    const up = await sb.storage.from(STORAGE.VEHICLE_DOCS).upload(objectPath, fs.readFileSync(RC_FILE), { contentType: 'image/png', upsert: true });
    check(`upload vehicle-docs/<uid>/${table}/<uuid>.png`, !up.error, up.error?.message);
    const ins = await sb.from(table).insert({ ...row, document_path: objectPath }).select('id').single();
    check(`insert ${table}`, !ins.error, ins.error ? `${ins.error.code} ${ins.error.message}` : '');
    const back = await sb.from(table).select('id,document_path,vehicle_id').eq('vehicle_id', vehicleId);
    check(`read back ${table}`, back.data?.length === 1 && back.data[0].document_path === objectPath);
    const signed = await sb.storage.from(STORAGE.VEHICLE_DOCS).createSignedUrl(objectPath, 300);
    const res = signed.data ? await fetch(signed.data.signedUrl) : undefined;
    check(`signed URL ${table}`, !!res?.ok, res ? `HTTP ${res.status}` : signed.error?.message);
  }
  const active = await sb.from(REST.USER_VEHICLES).select('id', { count: 'exact', head: true }).eq('is_active', true);
  check('routing: active vehicles = 1 (relaunch → Dashboard)', active.count === 1, `count=${active.count}`);
  await sb.auth.signOut({ scope: 'local' });
  console.log(failures ? `${failures} check(s) failed` : 'All 3/3 writes confirmed live.');
  process.exitCode = failures ? 1 : 0;
}

main();
