import { http, HttpResponse } from 'msw';
import { StyleSheet } from 'react-native';
import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { colors } from '@/theme/colors';
import { markOnboardingSkipped } from '@/storage/onboardingFlags';
import {
  UID,
  SERVICE_HISTORY_COUNT,
  makeSession,
  resetMyVehicles,
  setCounts,
  setOnboardingBackend,
  setShareRows,
  setUserDetails,
  setVdocs,
  vehicleRow,
} from '../../../test/msw/fixtures';
import { server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

const t = strings.dashboard;

/** Relaunch with a stored session; `skip` sets onboarding skip flags so the app opens on the dashboard. */
async function launch(skip: ('dl' | 'documents')[] = []) {
  for (const flag of skip) {
    await markOnboardingSkipped(flag, UID);
  }
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
  await screen.findByTestId('dashboard');
}

describe('Dashboard', () => {
  it('complete: header, vehicle carousel, tile grid with real counts, health banner, quick links, tabs', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 2 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345'), vehicleRow('v-2', 'TS09AB1234')]);
    setCounts({ vdocs_insurance: 3, service_bookings: 5, [SERVICE_HISTORY_COUNT]: 4 });
    // 100% profile: photo saved + a vehicle with a document (name, email, mobile, licence are in the fixtures).
    setUserDetails({ avatar_url: 'uid/avatar.png' });
    setVdocs('vdocs_insurance', [{ id: 'i1', vehicle_id: 'v-1' }]);
    // 3 share rows, 2 people (one person has both vehicles): the tile counts people, like the cards.
    setShareRows([
      { id: 's1', vehicle_id: 'v-1', member_user_id: 'u-2', member_phone: '9000000001', member_role: 'driver', status: 'active' },
      { id: 's2', vehicle_id: 'v-2', member_user_id: 'u-2', member_phone: '9000000001', member_role: 'driver', status: 'active' },
      { id: 's3', vehicle_id: 'v-1', member_user_id: null, member_phone: '9000000002', member_role: 'family', status: 'pending' },
    ]);
    await launch();
    expect(await screen.findByText('Welcome Test!')).toBeTruthy();
    expect(screen.getByTestId('dashboard-email')).toHaveTextContent('test-user@sterow.test');
    expect(await screen.findByTestId('vehicle-card-v-1')).toHaveTextContent('MG ZS EVTS09EV2345');
    expect(screen.getByTestId('vehicle-card-v-2')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('tile-vehicles')).toHaveTextContent(new RegExp(t.available('2'))));
    await waitFor(() => expect(screen.getByTestId('tile-documents')).toHaveTextContent(new RegExp(t.available('4')))); // 3 + DL
    await waitFor(() => expect(screen.getByTestId('tile-share-access')).toHaveTextContent(new RegExp(t.available('2'))));
    expect(screen.getByTestId('tile-book-service')).toHaveTextContent(new RegExp(t.records('5')));
    expect(screen.getByTestId('tile-service-history')).toHaveTextContent(new RegExp(t.records('4')));
    expect(screen.getByTestId('tile-challans')).toHaveTextContent(new RegExp(t.pending('0'))); // no API yet
    expect(screen.queryByTestId('profile-pending')).toBeNull(); // 100%
    expect(screen.getByTestId('health-banner')).toBeTruthy();
    expect(screen.getByTestId('quick-link-carpool').props.accessibilityState).toMatchObject({ disabled: true });
    for (const tab of ['HomeTab', 'ServicesTab', 'RewardsTab', 'DealersTab', 'HelpTab']) {
      expect(screen.getByTestId(`tab-${tab}`)).toBeTruthy();
    }
    expect(screen.getByTestId('tab-HomeTab').props.accessibilityState).toMatchObject({ selected: true });
  });

  it('empty API responses: every tile shows 0, challans not red, no health score, Share Access empty', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 1 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json([])));
    await launch(['dl']);
    await waitFor(() => expect(screen.getByTestId('tile-documents')).toHaveTextContent(new RegExp(t.available('0'))));
    expect(screen.getByTestId('tile-vehicles')).toHaveTextContent(new RegExp(t.available('1')));
    await waitFor(() => expect(screen.getByTestId('tile-share-access')).toHaveTextContent(new RegExp(t.available('0'))));
    expect(screen.getByTestId('tile-book-service')).toHaveTextContent(new RegExp(t.records('0')));
    expect(screen.getByTestId('tile-service-history')).toHaveTextContent(new RegExp(t.records('0')));
    const challans = screen.getByTestId('tile-challans');
    expect(challans).toHaveTextContent(new RegExp(t.pending('0')));
    const challanCount = within(challans).getByText(t.pending('0'));
    expect(challanCount).toHaveStyle({ color: colors.dashboard.count });
    expect(challanCount).not.toHaveStyle({ color: colors.dashboard.countAlert });
    expect(screen.getByTestId('health-banner').props.accessibilityLabel).toBe(t.health.a11yNoScore);
    expect(screen.queryByText('80%')).toBeNull();

    await fireEvent.press(screen.getByTestId('tile-share-access'));
    const empty = await screen.findByTestId('share-access-empty');
    expect(empty).toHaveTextContent(new RegExp(strings.shareAccess.emptyTitle));
    expect(screen.queryByTestId(/^person-/)).toBeNull();
    expect(screen.getByTestId('share-access-cta')).toHaveTextContent(strings.shareAccess.cta);
  });

  it('layout: the tab bar sits below the scroll view (in flow), so the last tiles and Quick Links are reachable', async () => {
    // bottom-tabs lays a custom tabBar out *after* the screens, not over them: the dashboard ScrollView
    // ends at the tab bar's top edge and needs no tab-bar-height padding. If the tab bar is ever made
    // absolute / floating (e.g. a blur bar), this fails: then pad the ScrollView by tab bar + safe area.
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    await launch();
    await screen.findByTestId('dashboard-tiles');
    const tabBar = screen.getByTestId('tab-bar');
    expect(StyleSheet.flatten(tabBar.props.style).position).not.toBe('absolute');
    expect(within(screen.getByTestId('dashboard')).queryByTestId('tab-bar')).toBeNull();
    // The last content (Quick Links) is inside the scroll view, after the last tile row.
    const scroll = within(screen.getByTestId('dashboard'));
    expect(scroll.getByTestId('tile-challans')).toBeTruthy();
    expect(scroll.getByTestId('quick-link-carpool')).toBeTruthy();
  });

  it('no vehicle: Book Service would be disabled; the task list replaces the tiles', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    await launch(['documents']);
    expect(await screen.findByTestId('vehicle-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('tile-book-service')).toBeNull();
  });

  // name + email + mobile + licence = 4/6 (no photo, no vehicle with a document)
  it('incomplete, no vehicle (variant 2): "Your Profile info pending" 67%, N/A card, task list', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    await launch(['documents']);
    const banner = await screen.findByTestId('profile-pending');
    await waitFor(() => expect(banner).toHaveTextContent(/67%/));
    expect(banner).toHaveTextContent(new RegExp(t.profilePending));
    expect(screen.getByTestId('vehicle-placeholder')).toHaveTextContent(`${t.noVehicleTitle}${t.noVehicleSubtitle}`);
    expect(screen.getByTestId('dashboard-tasks')).toBeTruthy();
    expect(screen.queryByTestId('dashboard-tiles')).toBeNull();
    expect(screen.getByTestId('task-drivers')).toHaveTextContent(new RegExp(t.tasks.driversSubtitle));
  });

  it('"Complete Now" opens the first missing onboarding step (no vehicle → 3/3)', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    setUserDetails({ avatar_url: 'uid/avatar.png' });
    await launch(['documents']);
    await waitFor(() => expect(screen.getByTestId('profile-pending')).toHaveTextContent(/83%/));
    await fireEvent.press(screen.getByTestId('profile-pending'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
  });

  it('incomplete with a vehicle (variant 1): banner + carousel + grid; missing licence → 2/3', async () => {
    setUserDetails({ avatar_url: 'uid/avatar.png' });
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 1 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    // The routing skipped 1/3–2/3 (flags) so the app opens on the dashboard.
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json([])));
    await launch(['dl']);
    // name + email + photo + mobile = 4/6 (no licence, no vehicle document)
    await waitFor(() => expect(screen.getByTestId('profile-pending')).toHaveTextContent(/67%/));
    expect(await screen.findByTestId('vehicle-card-v-1')).toBeTruthy();
    expect(screen.getByTestId('dashboard-tiles')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('profile-pending'));
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
  });

  it('tiles and tabs without a feature yet open "Coming soon"; Home returns to the dashboard', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    await launch();
    await fireEvent.press(await screen.findByTestId('tile-challans'));
    const soon = await screen.findByTestId('coming-soon');
    expect(within(soon).getByText(t.tiles.challans)).toBeTruthy();
    await fireEvent.press(screen.getByTestId('light-screen-back'));
    await fireEvent.press(screen.getByTestId('tab-DealersTab'));
    expect(await screen.findAllByText(strings.tabs.dealers)).toHaveLength(2); // tab label + screen title
    expect(screen.getByTestId('tab-DealersTab').props.accessibilityState).toMatchObject({ selected: true });
    await fireEvent.press(screen.getByTestId('tab-HomeTab'));
    expect(screen.getByTestId('tab-HomeTab').props.accessibilityState).toMatchObject({ selected: true });
  });

  describe('profile completion (badge, ring, Complete Now)', () => {
    const setupVehicle = () => {
      setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 1 });
      resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    };

    it('photo missing only → 83%; the ring and a11y label use the same percent; Complete Now → 1/3 profile', async () => {
      setupVehicle();
      setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1' }]);
      await launch();
      const banner = await screen.findByTestId('profile-pending');
      await waitFor(() => expect(banner).toHaveTextContent(/83%/));
      expect(banner.props.accessibilityLabel).toBe(t.profilePendingA11y(83));
      await fireEvent.press(banner);
      expect(await screen.findByTestId('onboarding-profile')).toBeTruthy();
    });

    it('vehicle without a document → 83%, Complete Now → 3/3 documents', async () => {
      setupVehicle();
      setUserDetails({ avatar_url: 'uid/avatar.png' });
      await launch();
      await waitFor(() => expect(screen.getByTestId('profile-pending')).toHaveTextContent(/83%/));
      await fireEvent.press(screen.getByTestId('profile-pending'));
      expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    });

    it('100% → the banner is hidden', async () => {
      setupVehicle();
      setUserDetails({ avatar_url: 'uid/avatar.png' });
      setVdocs('vdocs_fastag', [{ id: 'f1', vehicle_id: 'v-1' }]);
      await launch();
      await screen.findByTestId('vehicle-card-v-1');
      await waitFor(() => expect(screen.getByTestId('tile-vehicles')).toHaveTextContent(new RegExp(t.available('1'))));
      await waitFor(() => expect(screen.queryByTestId('profile-pending')).toBeNull());
    });

    it('updates live: data saved elsewhere shows when the dashboard regains focus (83% → hidden)', async () => {
      setupVehicle();
      setVdocs('vdocs_regcertificate', [{ id: 'r1', vehicle_id: 'v-1' }]);
      await launch();
      await waitFor(() => expect(screen.getByTestId('profile-pending')).toHaveTextContent(/83%/));
      await fireEvent.press(screen.getByTestId('tile-challans'));
      await screen.findByTestId('coming-soon');
      setUserDetails({ avatar_url: 'uid/avatar.png' }); // e.g. saved from My Profile / another device
      await fireEvent.press(screen.getByTestId('light-screen-back'));
      await waitFor(() => expect(screen.queryByTestId('profile-pending')).toBeNull());
    });
  });
});
