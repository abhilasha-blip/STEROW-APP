import { fireEvent, screen } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { makeSession, TEST_OTP } from '../../../test/msw/fixtures';
import { goToVerify, typeOtp } from '../../../test/flows';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

describe('navigation', () => {
  it('a stored session at launch opens the Dashboard with name, masked phone and role', async () => {
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests(); // simulate relaunch: same Keychain, new client
    await renderApp();
    expect(await screen.findByTestId('welcome')).toHaveTextContent('Welcome, Test User');
    expect(screen.getByTestId('masked-phone')).toHaveTextContent('XXXXX X9999');
    expect(screen.getByTestId('roles')).toHaveTextContent('user');
  });

  it('sign in → Dashboard → Log out → back to Sign In', async () => {
    await renderApp();
    await goToVerify();
    await typeOtp(TEST_OTP);
    await screen.findByTestId('welcome');
    await fireEvent.press(screen.getByRole('button', { name: strings.dashboard.logout }));
    expect(await screen.findByText(strings.mobileEntry.signin.title)).toBeTruthy();
    expect((await getSupabase().auth.getSession()).data.session).toBeNull();
  });
});
