import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { latestSavedDocuments, listMyDocuments } from '@/api/services/myDocuments.service';
import { makeSession, setOnboardingBackend, setVdocs, UID } from '../../../../test/msw/fixtures';
import { requestLog } from '../../../../test/msw/server';

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('myDocuments.service', () => {
  it("lists the vehicle's documents (Insurance, Pollution, RC, FASTag) + the licence, with insurer and expiry", async () => {
    setOnboardingBackend({ hasDrivingLicense: true });
    setVdocs('vdocs_insurance', [
      { id: 'i1', vehicle_id: 'v-1', insurer: 'ICICI Lombard', end_date: '2025-01-15', document_path: 'u/vdocs_insurance/a.pdf' },
    ]);
    setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1', valid_upto: '2038-03-20T00:00:00', document_path: null }]);
    setVdocs('vdocs_pollution', [{ id: 'p1', vehicle_id: 'v-2', validity_expiry_date: '2024-12-10' }]); // another vehicle
    const docs = await listMyDocuments('v-1', UID);
    expect(docs.map(d => d.key)).toEqual(['insurance', 'rc', 'drivingLicence']);
    expect(docs[0]).toMatchObject({ issuer: 'ICICI Lombard', number: null, expiry: '2025-01-15', bucket: 'vehicle-docs' });
    expect(docs[1]).toMatchObject({ expiry: '2038-03-20', documentPath: null });
    expect(docs[2]).toMatchObject({ key: 'drivingLicence', bucket: 'driving-licenses', number: 'TS0120110012345' });
    const gets = requestLog.filter(r => r.method === 'GET' && r.url.includes('vdocs_'));
    expect(gets.every(r => r.url.includes('vehicle_id=eq.v-1'))).toBe(true);
  });

  it('latest saved per type: the newest row wins (the list is newest first)', () => {
    const doc = (key: 'insurance' | 'rc', id: string) =>
      ({ key, id, issuer: null, number: id, expiry: null, documentPath: null, bucket: 'vehicle-docs' }) as const;
    const latest = latestSavedDocuments([doc('insurance', 'new'), doc('insurance', 'old'), doc('rc', 'r1')]);
    expect(latest.insurance?.id).toBe('new');
    expect(latest.rc?.id).toBe('r1');
    expect(latest.fastag).toBeUndefined();
    expect(latestSavedDocuments(undefined)).toEqual({});
  });
});
