import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { groupShares, listSharedPeople } from '@/api/services/shareAccess.service';
import { makeSession, setShareRows, UID } from '../../../../test/msw/fixtures';
import { requestLog } from '../../../../test/msw/server';

beforeEach(async () => {
  __resetSupabaseForTests();
  await getSupabase().auth.setSession(makeSession());
  requestLog.length = 0;
});

describe('shareAccess.service', () => {
  it('reads only active shares on the signed-in user\'s own vehicles', async () => {
    await expect(listSharedPeople(UID)).resolves.toEqual([]);
    const get = requestLog.find(r => r.method === 'GET' && r.url.includes('vehicle_shares'));
    expect(get?.url).toContain(`owner_id=eq.${UID}`);
    expect(get?.url).toContain('is_active=eq.true');
  });

  it('groups a member\'s shares into one person with all their vehicles', async () => {
    setShareRows([
      { id: 's1', vehicle_id: 'v-1', member_user_id: 'u-9', member_phone: '9000000001', member_name: 'A', member_role: 'driver', status: 'active' },
      { id: 's2', vehicle_id: 'v-2', member_user_id: 'u-9', member_phone: '9000000001', member_name: 'A', member_role: 'driver', status: 'active' },
      { id: 's3', vehicle_id: 'v-1', member_user_id: null, member_phone: '9000000002', member_name: null, member_role: 'family', status: 'pending' },
    ]);
    await expect(listSharedPeople(UID)).resolves.toEqual([
      { id: 's1', name: 'A', phone: '9000000001', role: 'driver', verified: true, vehicleIds: ['v-1', 'v-2'] },
      { id: 's3', name: null, phone: '9000000002', role: 'family', verified: false, vehicleIds: ['v-1'] },
    ]);
  });

  it('the same phone with a pending and an active share is one (verified) person', () => {
    const people = groupShares([
      { id: 's1', vehicle_id: 'v-1', member_user_id: null, member_phone: '9000000001', status: 'pending' },
      { id: 's2', vehicle_id: 'v-2', member_user_id: 'u-9', member_phone: '9000000001', status: 'active' },
    ]);
    expect(people).toHaveLength(1);
    expect(people[0]).toMatchObject({ verified: true, vehicleIds: ['v-1', 'v-2'] });
  });

  it('unknown roles are dropped, not shown', () => {
    expect(groupShares([{ id: 's1', vehicle_id: 'v', member_role: 'boss' }])[0].role).toBeNull();
  });
});
