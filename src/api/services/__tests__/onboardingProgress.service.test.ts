import { http, HttpResponse } from 'msw';
import { ENDPOINTS } from '@/api/endpoints';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import {
  DOCUMENT_TABLES,
  fetchOnboardingProgress,
  resolveStartRoute,
} from '@/api/services/onboardingProgress.service';
import { markOnboardingSkipped } from '@/storage/onboardingFlags';
import { makeSession, setOnboardingBackend, UID } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

const { REST } = ENDPOINTS.SUPABASE;
const countHeaders = (n: number) => ({ 'Content-Range': n ? `0-${n - 1}/${n}` : '*/0' });

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('onboardingProgress.service', () => {
  it('reads the DL row and sums the four document tables (HEAD, count=exact)', async () => {
    server.use(http.head(urls.vdocs(REST.VDOCS_FASTAG), () => new HttpResponse(null, { headers: countHeaders(2) })));
    setOnboardingBackend({ hasDrivingLicense: true, documentCount: 3 });
    await expect(fetchOnboardingProgress(UID)).resolves.toEqual({ hasDrivingLicense: true, documentCount: 5 });
    expect(DOCUMENT_TABLES).toEqual(['vdocs_regcertificate', 'vdocs_insurance', 'vdocs_pollution', 'vdocs_fastag']);
    const heads = requestLog.filter(r => r.method === 'HEAD'); // the 3 default handlers log; FASTag is overridden
    expect(heads.map(r => r.url.split('?')[0].split('/').pop())).toEqual([
      'vdocs_regcertificate',
      'vdocs_insurance',
      'vdocs_pollution',
    ]);
    expect(heads.every(r => r.headers.get('prefer')?.includes('count=exact'))).toBe(true);
    setOnboardingBackend({ hasDrivingLicense: false, documentCount: 0 });
    // Only the FASTag rows (2, overridden above) are left.
    await expect(fetchOnboardingProgress(UID)).resolves.toEqual({ hasDrivingLicense: false, documentCount: 2 });
  });

  it('a backend error is an ApiError with the HTTP status', async () => {
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json({ message: 'denied' }, { status: 403 })));
    await expect(fetchOnboardingProgress(UID)).rejects.toMatchObject({ name: 'ApiError', status: 403 });
  });

  it('a malformed row fails schema validation', async () => {
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json([{ nope: 1 }])));
    await expect(fetchOnboardingProgress(UID)).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  });

  it('a missing count (no Content-Range) fails schema validation', async () => {
    server.use(http.head(urls.vdocs(REST.VDOCS_INSURANCE), () => new HttpResponse(null, { status: 200 })));
    await expect(fetchOnboardingProgress(UID)).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  });

  it('resolveStartRoute combines backend progress with the local flags', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, documentCount: 0 });
    await expect(resolveStartRoute(UID)).resolves.toBe('Step1Profile');
    await markOnboardingSkipped('profile', UID);
    await expect(resolveStartRoute(UID)).resolves.toBe('Step2DrivingLicence');
    await markOnboardingSkipped('dl', UID);
    await expect(resolveStartRoute(UID)).resolves.toBe('Step3Documents');
    await markOnboardingSkipped('documents', UID);
    await expect(resolveStartRoute(UID)).resolves.toBe('Dashboard');
  });

  it('resolveStartRoute never throws: errors → Dashboard', async () => {
    server.use(http.head(urls.vdocs(REST.VDOCS_POLLUTION), () => HttpResponse.error()));
    await expect(resolveStartRoute(UID)).resolves.toBe('Dashboard');
  });
});
