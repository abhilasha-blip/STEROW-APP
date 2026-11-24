import { http, HttpResponse } from 'msw';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { fetchDashboardCounts, profileCompletion } from '@/api/services/dashboard.service';
import { makeSession, SERVICE_HISTORY_COUNT, setCounts, setOnboardingBackend, UID } from '../../../../test/msw/fixtures';
import { requestLog, server } from '../../../../test/msw/server';
import { urls } from '../../../../test/msw/urls';

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('dashboard.service', () => {
  it('counts: documents = the four vdocs tables + the licence; open bookings; service history', async () => {
    setOnboardingBackend({ hasDrivingLicense: true });
    setCounts({
      vdocs_regcertificate: 1,
      vdocs_insurance: 2,
      vdocs_fastag: 1,
      service_bookings: 5,
      [SERVICE_HISTORY_COUNT]: 3,
    });
    await expect(fetchDashboardCounts(UID)).resolves.toEqual({ documents: 5, bookings: 5, serviceHistory: 3 });
    const heads = requestLog.filter(r => r.method === 'HEAD');
    expect(heads).toHaveLength(7);
    expect(heads.every(r => r.headers.get('prefer')?.includes('count=exact'))).toBe(true);
    expect(heads.find(r => r.url.includes('user_driving_licenses'))?.url).toContain(`user_id=eq.${UID}`);
    // Bookings: only the user's (customer_id), split by status. Shares are counted from Share Access's query.
    expect(heads.some(r => r.url.includes('vehicle_shares'))).toBe(false);
    const bookings = heads.filter(r => r.url.includes('service_bookings')).map(r => decodeURIComponent(r.url));
    expect(bookings.every(u => u.includes(`customer_id=eq.${UID}`))).toBe(true);
    expect(bookings.some(u => u.includes('status=not.in.(') && u.includes('cancelled'))).toBe(true);
    expect(bookings.some(u => u.includes('status=in.(service_completed'))).toBe(true);
  });

  it('no data: every count is 0', async () => {
    setOnboardingBackend({ hasDrivingLicense: false });
    await expect(fetchDashboardCounts(UID)).resolves.toEqual({ documents: 0, bookings: 0, serviceHistory: 0 });
  });

  it('a failing count is null (shown as "–"); the others still load', async () => {
    server.use(http.head(urls.table('vdocs_insurance'), () => new HttpResponse(null, { status: 500 })));
    setCounts({ service_bookings: 3 });
    await expect(fetchDashboardCounts(UID)).resolves.toMatchObject({ documents: null, bookings: 3 });
  });

  it('profile completion: % of profile / licence / vehicle; "Complete Now" opens the first missing step', () => {
    expect(profileCompletion({ profile: false, drivingLicence: false, vehicle: false })).toMatchObject({
      percent: 0,
      nextStep: 'Step1Profile',
    });
    expect(profileCompletion({ profile: true, drivingLicence: false, vehicle: true })).toMatchObject({
      percent: 67,
      nextStep: 'Step2DrivingLicence',
    });
    expect(profileCompletion({ profile: true, drivingLicence: true, vehicle: false })).toMatchObject({
      percent: 67,
      nextStep: 'Step3Documents',
    });
    expect(profileCompletion({ profile: true, drivingLicence: true, vehicle: true })).toMatchObject({
      percent: 100,
      nextStep: null,
    });
  });
});
