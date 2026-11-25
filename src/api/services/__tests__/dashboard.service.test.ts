import { http, HttpResponse } from 'msw';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { fetchDashboardCounts, fetchVehicleDocumentCounts } from '@/api/services/dashboard.service';
import { makeSession, SERVICE_HISTORY_COUNT, setCounts, setOnboardingBackend, setVdocs, UID } from '../../../../test/msw/fixtures';
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

  it('documents per vehicle: rows from the four vdocs tables for the given vehicles (0 when none)', async () => {
    setVdocs('vdocs_insurance', [{ id: 'i1', vehicle_id: 'v-1' }, { id: 'i2', vehicle_id: 'v-9' }]);
    setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1' }]);
    await expect(fetchVehicleDocumentCounts(['v-1', 'v-2'])).resolves.toEqual({ 'v-1': 2, 'v-2': 0 });
    const gets = requestLog.filter(r => r.method === 'GET' && r.url.includes('vdocs_')).map(r => decodeURIComponent(r.url));
    expect(gets).toHaveLength(4);
    expect(gets.every(u => u.includes('vehicle_id=in.(v-1,v-2)'))).toBe(true);
  });

  it('documents per vehicle: no vehicles → no request', async () => {
    await expect(fetchVehicleDocumentCounts([])).resolves.toEqual({});
    expect(requestLog.some(r => r.url.includes('vdocs_'))).toBe(false);
  });
});
