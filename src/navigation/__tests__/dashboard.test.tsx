import { http, HttpResponse } from 'msw';
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
    setCounts({ vdocs_insurance: 3, vehicle_shares: 2, service_bookings: 5, [SERVICE_HISTORY_COUNT]: 4 });
    await launch();
    expect(await screen.findByText('Welcome Test!')).toBeTruthy();
    expect(screen.getByTestId('dashboard-email')).toHaveTextContent('test-user@sterow.test');
    expect(await screen.findByTestId('vehicle-card-v-1')).toHaveTextContent('MG ZS EVTS09EV2345');
    expect(screen.getByTestId('vehicle-card-v-2')).toBeTruthy();
    await waitFor(() => expect(screen.getByTestId('tile-vehicles')).toHaveTextContent(new RegExp(t.available('2'))));
    await waitFor(() => expect(screen.getByTestId('tile-documents')).toHaveTextContent(new RegExp(t.available('4')))); // 3 + DL
    expect(screen.getByTestId('tile-share-access')).toHaveTextContent(new RegExp(t.available('2')));
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
    expect(screen.getByTestId('tile-share-access')).toHaveTextContent(new RegExp(t.available('0')));
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

  it('no vehicle: Book Service would be disabled; the task list replaces the tiles', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    await launch(['documents']);
    expect(await screen.findByTestId('vehicle-placeholder')).toBeTruthy();
    expect(screen.queryByTestId('tile-book-service')).toBeNull();
  });

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
    await launch(['documents']);
    await waitFor(() => expect(screen.getByTestId('profile-pending')).toHaveTextContent(/67%/));
    await fireEvent.press(screen.getByTestId('profile-pending'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
  });

  it('incomplete with a vehicle (variant 1): banner + carousel + grid; missing licence → 2/3', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 1 });
    resetMyVehicles([vehicleRow('v-1', 'TS09EV2345')]);
    // The routing skipped 1/3–2/3 (flags) so the app opens on the dashboard.
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json([])));
    await launch(['dl']);
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
});
