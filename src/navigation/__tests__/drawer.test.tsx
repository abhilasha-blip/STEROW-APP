import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { DRAWER_ROWS } from '@/navigation/DrawerContent';
import { makeSession, resetMyVehicles, setOnboardingBackend, vehicleRow } from '../../../test/msw/fixtures';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

const t = strings.drawer;

async function openDrawer() {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
  resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
  await fireEvent.press(await screen.findByTestId('dashboard-menu'));
  return screen.getByTestId('drawer');
}

describe('Side drawer', () => {
  it('shows the avatar, name, email and the rows in design order, then Logout', async () => {
    const drawer = await openDrawer();
    await waitFor(() => expect(within(drawer).getByTestId('drawer-name')).toHaveTextContent('Test User'));
    expect(within(drawer).getByTestId('drawer-email')).toHaveTextContent('test-user@sterow.test');
    expect(DRAWER_ROWS.map(r => r.label)).toEqual([
      t.myProfile,
      t.myVehicles,
      t.myDocuments,
      t.myServices,
      t.shareAccess,
      t.findMyVehicles,
      t.myRewards,
      t.referFriend,
      t.feedback,
      t.faqs,
      t.help,
      t.changeLanguage,
    ]);
    for (const row of DRAWER_ROWS) {
      expect(within(drawer).getByTestId(`drawer-${row.key}`)).toHaveTextContent(row.label);
    }
    expect(within(drawer).getByTestId('drawer-logout')).toHaveTextContent(t.logout);
  });

  it('rows without a screen yet open "Coming soon" with their title', async () => {
    await openDrawer();
    await fireEvent.press(screen.getByTestId('drawer-faqs'));
    const soon = await screen.findByTestId('coming-soon');
    expect(within(soon).getByText(t.faqs)).toBeTruthy();
  });

  it('close (X) closes it; Logout signs out', async () => {
    await openDrawer();
    await fireEvent.press(screen.getByTestId('drawer-close'));
    await fireEvent.press(screen.getByTestId('dashboard-menu'));
    await fireEvent.press(screen.getByTestId('drawer-logout'));
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect((await getSupabase().auth.getSession()).data.session).toBeNull();
  });
});
