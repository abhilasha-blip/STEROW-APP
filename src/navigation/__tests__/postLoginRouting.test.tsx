import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { isOnboardingSkipped, markOnboardingSkipped } from '@/storage/onboardingFlags';
import { useAuthStore } from '@/store/auth.store';
import { makeSession, setOnboardingBackend, TEST_OTP, UID } from '../../../test/msw/fixtures';
import { requestLog, server } from '../../../test/msw/server';
import { urls } from '../../../test/msw/urls';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

const HIDDEN = { includeHiddenElements: true };

/** A previous run's session in the Keychain, then a fresh app (relaunch). */
async function relaunchWithSession() {
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
}

async function signIn() {
  await renderApp();
  await goToVerify();
  await typeOtp(TEST_OTP);
}

describe('post-login routing (auth store bootstrap)', () => {
  it('new user (no DL, no vehicle) → sign-in opens onboarding 1/4 with no way back to sign-in', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await signIn();
    expect(await screen.findByTestId('onboarding-profile')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('1/4');
    expect(screen.getByTestId('onboarding-no-back')).toBeTruthy();
    expect(screen.queryByLabelText(strings.common.back)).toBeNull();
    expect(useAuthStore.getState().startRoute).toBe('Step1Profile');
    // The routing reads: the DL row by user_id, the vehicle count by HEAD + count=exact.
    const dl = requestLog.find(r => r.url.startsWith(urls.drivingLicenses));
    expect(dl?.url).toContain(`user_id=eq.${UID}`);
    const count = requestLog.find(r => r.url.startsWith(urls.userVehicles));
    expect(count?.method).toBe('HEAD');
    expect(count?.headers.get('prefer')).toContain('count=exact');
  });

  it('DL saved, no vehicle → 2/4 (no back arrow)', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: 0 });
    await relaunchWithSession();
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('2/4');
    expect(screen.queryByLabelText(strings.common.back)).toBeNull();
  });

  it('DL skipped (local flag), no vehicle → 2/4', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await markOnboardingSkipped('dl', UID);
    await relaunchWithSession();
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
  });

  it('DL and vehicle skipped → Dashboard', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await markOnboardingSkipped('dl', UID);
    await markOnboardingSkipped('vehicle', UID);
    await relaunchWithSession();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it('a vehicle but no DL (and not skipped) → 1/4 first', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 2 });
    await relaunchWithSession();
    expect(await screen.findByTestId('onboarding-profile')).toBeTruthy();
  });

  it('onboarding done (DL + vehicle) → Dashboard', async () => {
    await relaunchWithSession();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(useAuthStore.getState().startRoute).toBe('Dashboard');
  });

  it('the route is decided before the app renders (splash stays while the reads are pending)', async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    server.use(
      http.head(urls.userVehicles, async () => {
        await gate;
        return new HttpResponse(null, { headers: { 'Content-Range': '*/0' } });
      }),
    );
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests();
    await renderApp();
    await waitFor(() =>
      expect(requestLog.some(r => r.url.startsWith(urls.drivingLicenses))).toBe(true),
    );
    expect(useAuthStore.getState().status).toBe('loading'); // RootNavigator renders nothing: splash
    expect(screen.queryByTestId('dashboard', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('onboarding-profile', HIDDEN)).toBeNull();
    release();
    expect(await screen.findByTestId('onboarding-profile')).toBeTruthy();
  });

  it('progress unreadable (500) → Dashboard, never locked out', async () => {
    server.use(
      http.get(urls.drivingLicenses, () => HttpResponse.json({ message: 'boom' }, { status: 500 })),
    );
    await relaunchWithSession();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it("1/4 Skip → flag set; 2/4 Skip → Dashboard (Back can't return); relaunch → Dashboard", async () => {
    setOnboardingBackend({ hasDrivingLicense: false, vehicleCount: 0 });
    await signIn();
    await fireEvent.press(await screen.findByTestId('profile-skip'));
    expect(await screen.findByTestId('onboarding-vehicle')).toBeTruthy();
    await waitFor(async () => expect(await isOnboardingSkipped('dl', UID)).toBe(true));
    expect(await isOnboardingSkipped('vehicle', UID)).toBe(false);

    await fireEvent.press(screen.getByTestId('vehicle-skip'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('onboarding-vehicle', HIDDEN)).toBeNull());
    await waitFor(async () => expect(await isOnboardingSkipped('vehicle', UID)).toBe(true));

    // Relaunch: same Keychain (session + flags), new client and app tree.
    await screen.unmount();
    useAuthStore.setState({ status: 'loading' });
    resetAppStateKeepingKeychain();
    await renderApp();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it('flags are per user: another uid is not skipped', async () => {
    await markOnboardingSkipped('dl', UID);
    expect(await isOnboardingSkipped('dl', 'someone-else')).toBe(false);
  });
});

/** resetAppState() minus nothing persistent: the Keychain mock survives (it's cleared in afterEach). */
function resetAppStateKeepingKeychain() {
  resetAppState();
}
