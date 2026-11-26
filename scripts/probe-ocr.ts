/**
 * ONE authenticated call to the public licence OCR (may be billed per call), approved separately:
 *
 *   npx tsx scripts/probe-ocr.ts --yes
 *
 * Signs in with the fixed test login only (9999999999), sends the clearly marked DUMMY / SAMPLE licence
 * image (design/onboarding/sample-dl.png) as a data URL to POST APP/ocr/driving-license exactly once
 * (no retry, whatever the answer), and saves the status, timing and the response SHAPE (field names +
 * types; a confidence value if present; error code / message on failure) to
 * docs/api/examples/ocr.driving-license.probe.json (no tokens, no image).
 */
import fs from 'node:fs';
import path from 'node:path';
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
if (!process.argv.includes('--yes')) {
  throw new Error('This makes one billable OCR call: pass --yes once it is approved.');
}
if (env.TEST_PHONE !== '9999999999' || !env.TEST_OTP) {
  throw new Error('Only with the fixed test login (TEST_PHONE=9999999999).');
}
/** Clearly marked DUMMY / SAMPLE licence image (no real person). */
const DL_FILE = path.join(ROOT, 'design/onboarding/sample-dl.png');
const OUT = path.join(ROOT, 'docs/api/examples/ocr.driving-license.probe.json');

async function postApp(p: string, body: unknown, token?: string) {
  const started = Date.now();
  const res = await fetch(`${env.APP_API_BASE_URL}${p}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token && { Authorization: `Bearer ${token}` }) },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  let json: unknown = text;
  try {
    json = JSON.parse(text);
  } catch {
    // keep the text
  }
  return { status: res.status, ms: Date.now() - started, json: json as { data?: Record<string, unknown> } };
}

/** Field names and types only (a `confidence` keeps its value; error envelopes keep code + message). */
function shape(v: unknown, key = ''): unknown {
  if (Array.isArray(v)) {
    return v.length ? [shape(v[0])] : [];
  }
  if (v && typeof v === 'object') {
    return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, shape(x, k)]));
  }
  if (/confidence/i.test(key) || key === 'code' || key === 'message') {
    return v;
  }
  return v === null ? 'null' : v === '' ? 'string (empty)' : typeof v;
}

async function main() {
  const req = await postApp(ENDPOINTS.APP.AUTH.OTP_REQUEST, { phone: env.TEST_PHONE, purpose: 'signin' });
  const ver = await postApp(ENDPOINTS.APP.AUTH.OTP_VERIFY, {
    requestId: req.json.data?.requestId,
    otp: env.TEST_OTP,
    purpose: 'signin',
  });
  const token = ver.json.data?.access_token;
  if (typeof token !== 'string') {
    throw new Error(`sign-in failed: HTTP ${ver.status}`);
  }
  const bytes = fs.readFileSync(DL_FILE);
  const image = `data:image/png;base64,${bytes.toString('base64')}`;
  // The one call. No retry.
  const ocr = await postApp(ENDPOINTS.APP.OCR.DRIVING_LICENSE, { image }, token);
  const result = {
    probedAt: new Date().toISOString(),
    request: {
      method: 'POST',
      path: `/api/public/v1${ENDPOINTS.APP.OCR.DRIVING_LICENSE}`,
      auth: 'Bearer <test account access token>',
      body: { image: `data:image/png;base64,<${bytes.length} bytes: design/onboarding/sample-dl.png (DUMMY)>` },
    },
    response: { status: ocr.status, ms: ocr.ms, shape: shape(ocr.json) },
  };
  fs.writeFileSync(OUT, JSON.stringify(result, null, 2) + '\n');
  console.log(JSON.stringify(result.response, null, 2));
}

main().catch(e => {
  console.error(String(e));
  process.exit(1);
});
