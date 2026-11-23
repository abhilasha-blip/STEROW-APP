import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { documentStatusFor, listMyDocuments } from '@/api/services/myDocuments.service';
import { makeSession, setOnboardingBackend, setVdocs, UID } from '../../../../test/msw/fixtures';
import { requestLog } from '../../../../test/msw/server';

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('myDocuments.service', () => {
  it('status from the expiry: Active, Expiring soon (≤ 30 days), Expired; none → Active', () => {
    const today = new Date(2026, 10, 23);
    expect(documentStatusFor(null, today)).toBe('active');
    expect(documentStatusFor('2026-12-24', today)).toBe('active'); // 31 days
    expect(documentStatusFor('2026-12-23', today)).toBe('expiringSoon'); // 30 days
    expect(documentStatusFor('2026-11-23', today)).toBe('expiringSoon'); // today
    expect(documentStatusFor('2026-11-22', today)).toBe('expired');
  });

  it("lists the vehicle's documents (Insurance, Pollution, RC, FASTag) + the licence, with insurer and expiry", async () => {
    setOnboardingBackend({ hasDrivingLicense: true });
    setVdocs('vdocs_insurance', [
      { id: 'i1', vehicle_id: 'v-1', insurer: 'ICICI Lombard', end_date: '2025-01-15', document_path: 'u/vdocs_insurance/a.pdf' },
    ]);
    setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1', valid_upto: '2038-03-20T00:00:00', document_path: null }]);
    setVdocs('vdocs_pollution', [{ id: 'p1', vehicle_id: 'v-2', validity_expiry_date: '2024-12-10' }]); // another vehicle
    const docs = await listMyDocuments('v-1', UID);
    expect(docs.map(d => d.key)).toEqual(['insurance', 'rc', 'drivingLicence']);
    expect(docs[0]).toMatchObject({ issuer: 'ICICI Lombard', expiry: '2025-01-15', bucket: 'vehicle-docs' });
    expect(docs[1]).toMatchObject({ expiry: '2038-03-20', documentPath: null });
    expect(docs[2]).toMatchObject({ key: 'drivingLicence', bucket: 'driving-licenses' });
    const gets = requestLog.filter(r => r.method === 'GET' && r.url.includes('vdocs_'));
    expect(gets.every(r => r.url.includes('vehicle_id=eq.v-1'))).toBe(true);
  });
});
