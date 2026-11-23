/**
 * LIVE WRITES (approved) on the demo backend with the fixed test login ONLY (9999999999).
 * Mirrors exactly what onboarding sends (same buckets, paths, bodies; endpoints.ts):
 *
 *   npx tsx scripts/live-profile-dl.ts avatar   # preset PNG → avatars, PATCH user_details.avatar_url
 *   npx tsx scripts/live-profile-dl.ts dl       # DUMMY sample licence → driving-licenses, upsert row
 *
 * Each step reads back what it wrote (row + signed URL fetched) and prints PASS/FAIL.
 * Redacted results go to docs/api/examples/live.<step>.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
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
  throw new Error('Writes are allowed with the fixed test login only (TEST_PHONE=9999999999).');
}
const { REST, STORAGE } = ENDPOINTS.SUPABASE;
const AVATAR_FILE = path.join(ROOT, 'src/assets/images/avatars/avatar-01@3x.png');
/** Clearly marked DUMMY / SAMPLE licence image (no real person). */
const DL_FILE = path.join(ROOT, 'design/onboarding/sample-dl.png');
const DL_NUMBER = 'DL0000000000000';

let failures = 0;
const check = (name: string, ok: boolean, detail = '') => {
  if (!ok) {
    failures++;
  }
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  ${detail}` : ''}`);
};
const save = (name: string, data: unknown) =>
  fs.writeFileSync(path.join(ROOT, `docs/api/examples/live.${name}.json`), JSON.stringify(data, null, 2) + '\n');

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
  const ver = await postApp(ENDPOINTS.APP.AUTH.OTP_VERIFY, {
    requestId: req.data?.requestId,
    otp: env.TEST_OTP,
    purpose: 'signin',
  });
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
  return { sb, uid: data.user.id };
}

async function signedFetch(sb: SupabaseClient, bucket: string, objectPath: string) {
  const { data, error } = await sb.storage.from(bucket).createSignedUrl(objectPath, 3600);
  if (error || !data) {
    return { ok: false, detail: error?.message ?? 'no url' };
  }
  const res = await fetch(data.signedUrl);
  return { ok: res.ok, detail: `HTTP ${res.status} ${res.headers.get('content-type')} ${res.headers.get('content-length')} B` };
}

async function avatar(sb: SupabaseClient, uid: string) {
  const objectPath = STORAGE_PATHS.avatar(uid, Date.now(), 'avatar-01.png');
  const up = await sb.storage
    .from(STORAGE.AVATARS)
    .upload(objectPath, fs.readFileSync(AVATAR_FILE), { contentType: 'image/png', upsert: true });
  check('upload avatars/<uid>/<ts>-avatar-01.png', !up.error, up.error?.message ?? up.data?.path);
  const patch = await sb.from(REST.USER_DETAILS).update({ avatar_url: objectPath }).eq('id', uid).select('id,avatar_url');
  check('PATCH user_details.avatar_url', !patch.error && patch.data?.[0]?.avatar_url === objectPath, patch.error?.message);
  const back = await sb.from(REST.USER_DETAILS).select('avatar_url').eq('id', uid).single();
  check('read back avatar_url', back.data?.avatar_url === objectPath);
  const signed = await signedFetch(sb, STORAGE.AVATARS, objectPath);
  check('signed URL serves the image', signed.ok, signed.detail);
  save('avatar', { path: objectPath.replace(uid, '<uid>'), upload: !up.error, patch: patch.error ?? 'ok', signed: signed.detail });
}

async function dl(sb: SupabaseClient, uid: string) {
  const objectPath = STORAGE_PATHS.drivingLicense(uid, Date.now(), 'sample-dl.png');
  const up = await sb.storage
    .from(STORAGE.DRIVING_LICENSES)
    .upload(objectPath, fs.readFileSync(DL_FILE), { contentType: 'image/png', upsert: true });
  check('upload driving-licenses/<uid>/<ts>-sample-dl.png', !up.error, up.error?.message ?? up.data?.path);
  const row = { user_id: uid, dl_number: DL_NUMBER, document_path: objectPath, issued_on: '2020-01-15', valid_upto: '2040-01-14' };
  const upsert = await sb.from(REST.USER_DRIVING_LICENSES).upsert(row, { onConflict: 'user_id' }).select('*').single();
  check('upsert user_driving_licenses (on_conflict user_id)', !upsert.error, upsert.error?.message);
  const again = await sb.from(REST.USER_DRIVING_LICENSES).upsert(row, { onConflict: 'user_id' }).select('id').single();
  check('second upsert updates the same row (no duplicate)', again.data?.id === upsert.data?.id, again.error?.message);
  const back = await sb.from(REST.USER_DRIVING_LICENSES).select('*').eq('user_id', uid);
  check('read back: one row, number + path + dates', back.data?.length === 1 && back.data[0].dl_number === DL_NUMBER &&
    back.data[0].document_path === objectPath && back.data[0].issued_on === '2020-01-15' && back.data[0].valid_upto === '2040-01-14');
  const signed = await signedFetch(sb, STORAGE.DRIVING_LICENSES, objectPath);
  check('signed URL serves the file', signed.ok, signed.detail);
  save('driving-license', {
    path: objectPath.replace(uid, '<uid>'),
    columns: back.data?.[0] ? Object.keys(back.data[0]) : [],
    row: back.data?.[0] ? { ...back.data[0], id: '<id>', user_id: '<uid>', document_path: '<path>' } : null,
    signed: signed.detail,
  });
}

async function main() {
  const step = process.argv[2];
  if (step !== 'avatar' && step !== 'dl') {
    throw new Error('Usage: live-profile-dl.ts avatar|dl');
  }
  const { sb, uid } = await signIn();
  await (step === 'avatar' ? avatar(sb, uid) : dl(sb, uid));
  await sb.auth.signOut({ scope: 'local' });
  process.exitCode = failures ? 1 : 0;
}

main();
