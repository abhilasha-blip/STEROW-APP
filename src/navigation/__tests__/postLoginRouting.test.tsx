import { http, HttpResponse } from 'msw';
import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { ENDPOINTS } from '@/api/endpoints';
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
const { REST } = ENDPOINTS.SUPABASE;

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

const fresh = () => setOnboardingBackend({ hasDrivingLicense: false, documentCount: 0 });

describe('post-login routing (3-step onboarding)', () => {
  it('new user → sign-in opens 1/3 Profile with no way back to sign-in', async () => {
    fresh();
    await signIn();
    expect(await screen.findByTestId('onboarding-profile')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('1/3');
    expect(screen.getByTestId('onboarding-no-back')).toBeTruthy();
    expect(screen.queryByLabelText(strings.common.back)).toBeNull();
    expect(useAuthStore.getState().startRoute).toBe('Step1Profile');
    expect(requestLog.find(r => r.url.startsWith(urls.drivingLicenses))?.url).toContain(`user_id=eq.${UID}`);
    const heads = requestLog.filter(r => r.method === 'HEAD').map(r => r.url.split('?')[0].split('/').pop());
    expect(heads.sort()).toEqual([REST.VDOCS_FASTAG, REST.VDOCS_INSURANCE, REST.VDOCS_POLLUTION, REST.VDOCS_RC].sort());
  });

  it('profile done (local flag), no DL → 2/3 (no back arrow)', async () => {
    fresh();
    await markOnboardingSkipped('profile', UID);
    await relaunchWithSession();
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('2/3');
    expect(screen.queryByLabelText(strings.common.back)).toBeNull();
  });

  it('DL saved, no documents → 3/3', async () => {
    setOnboardingBackend({ hasDrivingLicense: true, documentCount: 0 });
    await relaunchWithSession();
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('3/3');
  });

  it('DL skipped, no documents → 3/3', async () => {
    fresh();
    await markOnboardingSkipped('dl', UID);
    await relaunchWithSession();
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
  });

  it('DL and documents skipped → Dashboard', async () => {
    fresh();
    await markOnboardingSkipped('dl', UID);
    await markOnboardingSkipped('documents', UID);
    await relaunchWithSession();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it('onboarding done (DL + a document) → Dashboard', async () => {
    await relaunchWithSession();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(useAuthStore.getState().startRoute).toBe('Dashboard');
  });

  it('the route is decided before the app renders (splash stays while the reads are pending)', async () => {
    fresh();
    let release!: () => void;
    const gate = new Promise<void>(r => (release = r));
    server.use(
      http.head(urls.vdocs(REST.VDOCS_RC), async () => {
        await gate;
        return new HttpResponse(null, { headers: { 'Content-Range': '*/0' } });
      }),
    );
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests();
    await renderApp();
    await waitFor(() => expect(requestLog.some(r => r.url.startsWith(urls.drivingLicenses))).toBe(true));
    expect(useAuthStore.getState().status).toBe('loading'); // RootNavigator renders nothing: splash
    expect(screen.queryByTestId('dashboard', HIDDEN)).toBeNull();
    expect(screen.queryByTestId('onboarding-profile', HIDDEN)).toBeNull();
    release();
    expect(await screen.findByTestId('onboarding-profile')).toBeTruthy();
  });

  it('progress unreadable (500) → Dashboard, never locked out', async () => {
    server.use(http.get(urls.drivingLicenses, () => HttpResponse.json({ message: 'boom' }, { status: 500 })));
    await relaunchWithSession();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it("Skip 1/3 → 2/3, Skip 2/3 → 3/3, Skip 3/3 → Dashboard (Back can't return); relaunch → Dashboard", async () => {
    fresh();
    await signIn();
    await fireEvent.press(await screen.findByTestId('profile-skip'));
    expect(await screen.findByTestId('onboarding-dl')).toBeTruthy();
    await waitFor(async () => expect(await isOnboardingSkipped('profile', UID)).toBe(true));

    await fireEvent.press(screen.getByTestId('dl-skip'));
    expect(await screen.findByTestId('onboarding-documents')).toBeTruthy();
    await waitFor(async () => expect(await isOnboardingSkipped('dl', UID)).toBe(true));
    expect(await isOnboardingSkipped('documents', UID)).toBe(false);

    await fireEvent.press(screen.getByTestId('documents-skip'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    await waitFor(() => expect(screen.queryByTestId('onboarding-documents', HIDDEN)).toBeNull());
    await waitFor(async () => expect(await isOnboardingSkipped('documents', UID)).toBe(true));

    // Relaunch: same Keychain (session + flags), new client and app tree.
    await screen.unmount();
    resetAppState();
    await renderApp();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
  });

  it('flags are per user: another uid is not skipped', async () => {
    await markOnboardingSkipped('dl', UID);
    expect(await isOnboardingSkipped('dl', 'someone-else')).toBe(false);
  });
});
