import { fireEvent, screen } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { makeSession, TEST_OTP } from '../../../test/msw/fixtures';
import { goToVerify, typeOtp } from '../../../test/flows';
import { useOnboardingStore } from '@/store/onboarding.store';
import { EMPTY_PROFILE } from '@/screens/onboarding/useOnboardingProfileForm';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

describe('navigation', () => {
  it('a stored session at launch (onboarding done) opens the Dashboard placeholder', async () => {
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests(); // simulate relaunch: same Keychain, new client
    await renderApp();
    expect(await screen.findByTestId('dashboard')).toHaveTextContent(strings.dashboard.title);
    expect(screen.getByRole('button', { name: strings.dashboard.logout })).toBeTruthy();
    expect(screen.queryByText(/Welcome/)).toBeNull();
  });

  it('sign in → Dashboard → Log out → back to Sign In', async () => {
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await screen.findByTestId('dashboard');
    await fireEvent.press(screen.getByRole('button', { name: strings.dashboard.logout }));
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect((await getSupabase().auth.getSession()).data.session).toBeNull();
  });

  it('log out clears the in-memory onboarding values', async () => {
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await screen.findByTestId('dashboard');
    useOnboardingStore.getState().setProfile({ ...EMPTY_PROFILE, fullName: 'Ravi Kumar' });
    await fireEvent.press(screen.getByRole('button', { name: strings.dashboard.logout }));
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect(useOnboardingStore.getState().profile).toBeNull();
  });
});
