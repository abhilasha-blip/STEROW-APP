import { http, HttpResponse } from 'msw';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import {
  fetchOnboardingProgress,
  resolveStartRoute,
} from '@/api/services/onboardingProgress.service';
import { markOnboardingSkipped } from '@/storage/onboardingFlags';
import { makeSession, setOnboardingBackend, UID } from '../../../../test/msw/fixtures';
import { server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
});

describe('onboardingProgress.service', () => {
  it('reads the DL row and the vehicle count', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 3 });
    await expect(fetchOnboardingProgress(UID)).resolves.toEqual({
      hasDrivingLicense: true,
      vehicleCount: 3,
    });
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await expect(fetchOnboardingProgress(UID)).resolves.toEqual({
      hasDrivingLicense: false,
      vehicleCount: 0,
    });
  });

  it('a backend error is an ApiError with the HTTP status', async () => {
    server.use(
      http.get(urls.drivingLicenses, () =>
        HttpResponse.json({ message: 'denied' }, { status: 403 }),
      ),
    );
    await expect(fetchOnboardingProgress(UID)).rejects.toMatchObject({
      name: 'ApiError',
      status: 403,
    });
  });

  it('a malformed row fails schema validation', async () => {
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json([{ nope: 1 }])));
    await expect(fetchOnboardingProgress(UID)).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  });

  it('a missing count (no Content-Range) fails schema validation', async () => {
    server.use(http.head(urls.userVehicles, () => new HttpResponse(null, { status: 200 })));
    await expect(fetchOnboardingProgress(UID)).rejects.toMatchObject({ code: 'SCHEMA_MISMATCH' });
  });

  it('resolveStartRoute combines backend progress with the local skip flags', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await expect(resolveStartRoute(UID)).resolves.toBe('Step1Profile');
    await markOnboardingSkipped('dl', UID);
    await expect(resolveStartRoute(UID)).resolves.toBe('Step2Vehicle');
    await markOnboardingSkipped('vehicle', UID);
    await expect(resolveStartRoute(UID)).resolves.toBe('Dashboard');
  });

  it('resolveStartRoute never throws: errors → Dashboard', async () => {
    server.use(http.head(urls.userVehicles, () => HttpResponse.error()));
    await expect(resolveStartRoute(UID)).resolves.toBe('Dashboard');
  });
});
