/**
 * APPROVED one-off test write (2026-11-23), fixed test login 9999999999 ONLY.
 * Learns the database's real required columns for user_vehicles and the four vdocs tables:
 *
 *   npx tsx scripts/probe-required-fields.ts rollback-check   # does the server honour Prefer: tx=rollback?
 *   npx tsx scripts/probe-required-fields.ts probe            # see below
 *
 * Method: insert with nothing, read Postgres' "null value in column X" (23502) / FK / check errors, add a
 * value for X, repeat. Failed inserts create nothing. Only ONE vehicle and ONE document are really
 * created (as approved); the other document tables are probed with `Prefer: tx=rollback` when the
 * server allows it (nothing is kept), otherwise they're left unprobed. Everything created is deleted at
 * the end. Output: docs/api/examples/probe.required-fields.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { ENDPOINTS } from '../src/api/endpoints';

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
  throw new Error('Test writes are allowed with the fixed test login only (TEST_PHONE=9999999999).');
}
const { REST } = ENDPOINTS.SUPABASE;
/** Clearly fake registration number for the probe vehicle. */
const PROBE_VEHICLE_NUMBER = 'TS00ZZ0001';

async function postApp(p: string, body: unknown) {
  const res = await fetch(`${env.APP_API_BASE_URL}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { data?: Record<string, unknown> };
}

async function signIn() {
  const req = await postApp(ENDPOINTS.APP.AUTH.OTP_REQUEST, { phone: env.TEST_PHONE, purpose: 'signin' });
  const ver = await postApp(ENDPOINTS.APP.AUTH.OTP_VERIFY, { requestId: req.data?.requestId, otp: env.TEST_OTP, purpose: 'signin' });
  const token = String(ver.data?.access_token);
  const sb = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await sb.auth.setSession({ access_token: token, refresh_token: String(ver.data?.refresh_token) });
  if (error || !data.user) {
    throw error ?? new Error('no user');
  }
  return { sb, uid: data.user.id, token };
}

/** Raw PostgREST insert so we control the Prefer header (tx=rollback). */
async function rawInsert(token: string, table: string, row: object, rollback: boolean) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: `return=representation${rollback ? ',tx=rollback' : ''}`,
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text);
  } catch {}
  return { status: res.status, applied: res.headers.get('preference-applied'), body };
}

type Err = { code?: string; message?: string; details?: string; hint?: string };

/** Insert, adding a value for every column Postgres says is missing. */
async function discover(
  token: string,
  table: string,
  start: Record<string, unknown>,
  valueFor: (column: string) => unknown,
  rollback: boolean,
) {
  const row: Record<string, unknown> = { ...start };
  const required: string[] = [];
  const log: unknown[] = [];
  for (let i = 0; i < 25; i++) {
    const r = await rawInsert(token, table, row, rollback);
    log.push({ sent: Object.keys(row), status: r.status, applied: r.applied, error: r.status >= 300 ? r.body : undefined });
    if (r.status < 300) {
      return { ok: true, required, row: Array.isArray(r.body) ? r.body[0] : r.body, applied: r.applied, log };
    }
    const e = r.body as Err;
    const col = e.code === '23502' ? /column "([^"]+)"/.exec(e.message ?? '')?.[1] : undefined;
    if (!col) {
      return { ok: false, required, error: e, log };
    }
    required.push(col);
    const v = valueFor(col);
    if (v === undefined) {
      return { ok: false, required, error: { message: `no test value for ${col}` }, log };
    }
    row[col] = v;
  }
  return { ok: false, required, error: { message: 'too many rounds' }, log };
}

async function main() {
  const mode = process.argv[2];
  const { sb, uid, token } = await signIn();
  const out: Record<string, unknown> = {};

  // Does the server honour tx=rollback? A PATCH writing the same name back is a no-op either way.
  const name = (await sb.from(REST.USER_DETAILS).select('full_name').eq('id', uid).single()).data?.full_name;
  const check = await fetch(`${env.SUPABASE_URL}/rest/v1/${REST.USER_DETAILS}?id=eq.${uid}`, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,tx=rollback',
    },
    body: JSON.stringify({ full_name: name }),
  });
  const rollbackHonoured = check.headers.get('preference-applied')?.includes('tx=rollback') ?? false;
  console.log('tx=rollback honoured:', rollbackHonoured, `(HTTP ${check.status})`);
  out.rollbackHonoured = rollbackHonoured;
  if (mode === 'rollback-check') {
    await sb.auth.signOut({ scope: 'local' });
    return;
  }

  // Real master ids for FK columns.
  const make = (await sb.from(REST.VEHICLE_MAKES).select('id,name').order('name').limit(1)).data?.[0];
  const variant = (await sb.from(REST.VEHICLE_VARIANTS).select('id,model_id,variant_name,fuel_type,transmission_type').limit(1)).data?.[0];
  const model = variant ? (await sb.from(REST.VEHICLE_MODELS).select('id,make_id,name').eq('id', variant.model_id).single()).data : undefined;
  const vehicleValues: Record<string, unknown> = {
    vehicle_number: PROBE_VEHICLE_NUMBER,
    make_id: model?.make_id ?? make?.id,
    model_id: model?.id,
    variant_id: variant?.id,
    fuel_type: variant?.fuel_type ?? 'Petrol',
    transmission_type: variant?.transmission_type ?? 'Manual',
    rc_number: PROBE_VEHICLE_NUMBER,
    current_odometer: 0,
    entry_method: 'manual',
    owner_id: uid,
    user_id: uid,
    created_by: uid,
  };

  // 1) user_vehicles: the ONE real vehicle (start from nothing). Mode `doc`: reuse it (vehicles can't be deleted).
  const existing =
    mode === 'doc'
      ? (await sb.from(REST.USER_VEHICLES).select('*').eq('vehicle_number', PROBE_VEHICLE_NUMBER).maybeSingle()).data
      : null;
  const vehicle = existing
    ? { ok: true, required: ['(see the first run)'], row: existing, log: [], error: undefined }
    : await discover(token, REST.USER_VEHICLES, {}, c => vehicleValues[c], false);
  out.user_vehicles = vehicle;
  console.log('user_vehicles required:', vehicle.required, vehicle.ok ? 'CREATED' : JSON.stringify(vehicle.error));
  const vehicleId = vehicle.ok ? (vehicle.row as { id: string }).id : undefined;

  if (vehicleId) {
    const docValues: Record<string, unknown> = {
      vehicle_id: vehicleId,
      user_id: uid,
      registration_number: PROBE_VEHICLE_NUMBER,
      policy_no: 'PROBE-POLICY-1',
      insurer: 'Probe Insurer',
      certificate_no: 'PROBE-PUC-1',
      fastag_id: 'PROBE-FASTAG-1',
      make_id: vehicleValues.make_id,
      model_id: vehicleValues.model_id,
      variant_id: vehicleValues.variant_id,
    };
    // 2) The ONE real document: vdocs_insurance (the most required fields on the web).
    // RLS rejects a row without an owned vehicle before NOT NULL is checked: start with vehicle_id.
    const ins = await discover(token, REST.VDOCS_INSURANCE, { vehicle_id: vehicleId }, c => docValues[c], false);
    out[REST.VDOCS_INSURANCE] = ins;
    console.log('vdocs_insurance required:', ins.required, ins.ok ? 'CREATED' : JSON.stringify(ins.error));
    // 3) The other three: rolled back (nothing kept) if the server honours tx=rollback.
    for (const table of rollbackHonoured ? [REST.VDOCS_RC, REST.VDOCS_POLLUTION, REST.VDOCS_FASTAG] : []) {
      const r = await discover(token, table, {}, c => docValues[c], true);
      const kept = r.ok && r.applied !== 'tx=rollback';
      out[table] = { ...r, kept };
      console.log(`${table} required:`, r.required, r.ok ? `ok (preference-applied: ${r.applied})` : JSON.stringify(r.error));
      if (kept && r.row) {
        await sb.from(table).delete().eq('id', (r.row as { id: string }).id);
        console.log(`  ${table}: rollback not applied → deleted the row`);
      }
    }
    // 4) Clean up the real rows.
    if (ins.ok) {
      const d = await sb.from(REST.VDOCS_INSURANCE).delete().eq('id', (ins.row as { id: string }).id).select('id');
      console.log('delete vdocs_insurance:', d.error?.message ?? `ok (${d.data?.length ?? 0} row)`);
      out.deleteDocument = d.error ?? 'ok';
    }
    // Vehicles can't be deleted ("Use ownership transfer instead"): deactivate the probe vehicle instead.
    const dv = await sb.from(REST.USER_VEHICLES).update({ is_active: false }).eq('id', vehicleId).select('id,is_active');
    console.log('deactivate user_vehicles:', dv.error?.message ?? JSON.stringify(dv.data));
    out.deactivateVehicle = dv.error ?? dv.data;
    const left = await sb.from(REST.USER_VEHICLES).select('id', { count: 'exact', head: true });
    const active = await sb.from(REST.USER_VEHICLES).select('id', { count: 'exact', head: true }).eq('is_active', true);
    console.log('vehicles visible afterwards:', left.count, 'active:', active.count);
    const docsLeft = await sb.from(REST.VDOCS_INSURANCE).select('id', { count: 'exact', head: true });
    console.log('insurance rows visible afterwards:', docsLeft.count);
    // Same number again (soft delete vs unique)?
    const again = !rollbackHonoured ? { status: 0, applied: null, body: 'skipped (no rollback)' } : await rawInsert(token, REST.USER_VEHICLES, Object.fromEntries(vehicle.required.map(c => [c, vehicleValues[c]])), true);
    out.reinsertSameNumberRolledBack = { status: again.status, applied: again.applied, body: again.status >= 300 ? again.body : 'ok' };
    console.log('re-insert same number (rolled back):', again.status, again.applied, again.status >= 300 ? JSON.stringify(again.body) : 'ok');
  }

  const redact = (v: unknown) => JSON.parse(JSON.stringify(v).split(uid).join('<uid>'));
  fs.writeFileSync(path.join(ROOT, 'docs/api/examples/probe.required-fields.json'), JSON.stringify(redact(out), null, 2) + '\n');
  await sb.auth.signOut({ scope: 'local' });
}

main();
