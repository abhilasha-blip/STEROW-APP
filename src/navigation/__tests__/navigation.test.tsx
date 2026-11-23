import { screen } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { makeSession, TEST_OTP } from '../../../test/msw/fixtures';
import { goToVerify, logOut, typeOtp } from '../../../test/flows';
import { useOnboardingStore } from '@/store/onboarding.store';
import { EMPTY_PROFILE } from '@/screens/onboarding/useOnboardingProfileForm';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

describe('navigation', () => {
  it('a stored session at launch (onboarding done) opens the Dashboard with the first name and email', async () => {
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests(); // simulate relaunch: same Keychain, new client
    await renderApp();
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(await screen.findByText('Welcome Test!')).toBeTruthy(); // user_details.full_name "Test User"
    expect(await screen.findByText('test-user@sterow.test')).toBeTruthy();
    expect(screen.getByTestId('tab-bar')).toBeTruthy();
  });

  it('sign in → Dashboard → Log out → back to Sign In', async () => {
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await screen.findByTestId('dashboard');
    await logOut();
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect((await getSupabase().auth.getSession()).data.session).toBeNull();
  });

  it('log out clears the in-memory onboarding values', async () => {
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await screen.findByTestId('dashboard');
    useOnboardingStore.getState().setProfile({ ...EMPTY_PROFILE, fullName: 'Ravi Kumar' });
    await logOut();
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect(useOnboardingStore.getState().profile).toBeNull();
  });
});
