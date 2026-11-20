import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { makeSession } from '../../../test/msw/fixtures';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

describe('onboarding navigation (dev entry)', () => {
  it('Dashboard → "Start onboarding" → step 1 "1/4" → back to Dashboard', async () => {
    await getSupabase().auth.setSession(makeSession());
    __resetSupabaseForTests();
    await renderApp();
    await screen.findByTestId('welcome');

    await fireEvent.press(screen.getByText(strings.dashboard.startOnboarding));
    expect(await screen.findByText(strings.onboarding.profile.title)).toBeTruthy();
    expect(screen.getByTestId('onboarding-step')).toHaveTextContent('1/4');

    await fireEvent.press(screen.getByLabelText(strings.common.back));
    await waitFor(() => expect(screen.queryByTestId('onboarding-profile')).toBeNull());
    expect(screen.getByTestId('welcome')).toBeTruthy();
  });
});
