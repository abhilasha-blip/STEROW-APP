import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { useBookingStore } from '@/store/booking.store';
import { makeSession, resetMyVehicles, setOnboardingBackend, vehicleRow } from '../../../test/msw/fixtures';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(resetAppState);
afterEach(resetAppState);

const t = strings.bookService;

const disabled = (testID: string) => screen.getByTestId(testID).props.accessibilityState?.disabled;

/** Signed in, onboarding done, `vehicles` real vehicles; the dashboard is showing. */
async function launch(vehicles = [vehicleRow('v-1', 'TS09EV2345'), vehicleRow('v-2', 'TS09AB1234')]) {
  setOnboardingBackend({ hasDrivingLicense: true, vehicleCount: vehicles.length });
  resetMyVehicles(vehicles);
  await getSupabase().auth.setSession(makeSession());
  __resetSupabaseForTests();
  await renderApp();
  await screen.findByTestId('dashboard');
}

/** Dashboard → "Book Service" tile → Step 1. */
export async function openFlow(vehicles?: Parameters<typeof launch>[0]) {
  await launch(vehicles);
  await waitFor(() => expect(disabled('tile-book-service')).toBeFalsy());
  await fireEvent.press(screen.getByTestId('tile-book-service'));
  return screen.findByTestId('book-vehicle');
}

describe('Book a Service – entry and Step 1', () => {
  it('the dashboard tile opens Step 1 with the real vehicles; the stepper marks step 1 current', async () => {
    const step = await openFlow();
    expect(within(step).getByText(t.title)).toBeTruthy();
    expect(within(step).getByText(t.vehicle.title)).toBeTruthy();
    expect(await screen.findByTestId('book-vehicle-v-1')).toHaveTextContent(/TS09EV2345/);
    expect(screen.getByTestId('book-vehicle-v-2')).toHaveTextContent(/TS09AB1234/);
    expect(screen.getByTestId('booking-stepper-1-current')).toBeTruthy();
    expect(screen.getByTestId('booking-stepper-2-upcoming')).toBeTruthy();
    expect(screen.getByTestId('booking-stepper')).toHaveProp('accessibilityRole', 'progressbar');
    expect(screen.getByTestId('booking-stepper').props.accessibilityLabel).toBe(t.stepperA11y(1, 4, t.steps[0]));
    expect(screen.getByTestId('tab-bar')).toBeTruthy(); // bottom tabs stay visible
  });

  it('Next is disabled until a vehicle is chosen; the card is a radio', async () => {
    await openFlow();
    const card = await screen.findByTestId('book-vehicle-v-2');
    expect(card).toHaveProp('accessibilityRole', 'radio');
    expect(disabled('book-vehicle-next')).toBe(true);
    await fireEvent.press(card);
    expect(screen.getByTestId('book-vehicle-v-2').props.accessibilityState).toMatchObject({ checked: true });
    expect(disabled('book-vehicle-next')).toBe(false);
    expect(useBookingStore.getState().vehicleId).toBe('v-2');
  });

  it('a single vehicle is preselected', async () => {
    await openFlow([vehicleRow('v-1', 'TS09EV2345')]);
    await waitFor(() => expect(disabled('book-vehicle-next')).toBe(false));
  });

  it('the header back arrow leaves the flow (dashboard) and clears the booking', async () => {
    await openFlow();
    await fireEvent.press(await screen.findByTestId('book-vehicle-v-1'));
    await fireEvent.press(screen.getByTestId('light-screen-back'));
    await waitFor(() => expect(screen.queryByTestId('book-vehicle')).toBeNull());
    expect(useBookingStore.getState().vehicleId).toBeNull();
  });

  it('the drawer\'s "My Services" opens the flow', async () => {
    await launch();
    await fireEvent.press(screen.getByTestId('dashboard-menu'));
    await fireEvent.press(screen.getByTestId('drawer-services'));
    expect(await screen.findByTestId('book-vehicle')).toBeTruthy();
  });
});
