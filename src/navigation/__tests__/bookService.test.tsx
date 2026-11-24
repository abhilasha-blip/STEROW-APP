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
async function openFlow(vehicles?: Parameters<typeof launch>[0]) {
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

/** Step 1 (v-1) → Step 2. */
async function openStep2() {
  await openFlow();
  await fireEvent.press(await screen.findByTestId('book-vehicle-v-1'));
  await fireEvent.press(screen.getByTestId('book-vehicle-next'));
  return screen.findByTestId('book-services');
}

describe('Book a Service – Step 2 Choose Service', () => {
  const s = t.service;

  it('"Service Packages" is gone: Talk to Technician + exactly the two option cards', async () => {
    const step = await openStep2();
    expect(screen.getByTestId('booking-stepper-1-done')).toBeTruthy();
    expect(screen.getByTestId('booking-stepper-2-current')).toBeTruthy();
    expect(within(step).queryByText(/Service Packages/i)).toBeNull();
    expect(within(step).queryByText(/Common service packages/i)).toBeNull();
    expect(screen.getByTestId('talk-to-technician')).toHaveProp('accessibilityRole', 'radio');
    expect(screen.getByTestId('talk-to-technician')).toHaveTextContent(s.talkToTechnician);
    expect(screen.getAllByTestId(/^service-mode-/).map(c => c.props.testID)).toEqual(['service-mode-concern', 'service-mode-custom']);
    expect(screen.getByTestId('service-mode-concern')).toHaveTextContent(`${s.concernCard}${s.concernCardSubtitle}`);
    expect(screen.getByTestId('service-mode-custom')).toHaveTextContent(`${s.customCard}${s.customCardSubtitle}`);
  });

  it('Concern mode: Next needs ≥ 10 characters; live counter; short text shows a hint', async () => {
    await openStep2();
    expect(screen.getByTestId('service-mode-concern').props.accessibilityState).toMatchObject({ checked: true });
    expect(disabled('book-services-next')).toBe(true);
    expect(screen.getByTestId('concern-counter')).toHaveTextContent('0/500');
    expect(screen.getByTestId('concern-input')).toHaveProp('maxLength', 500);
    expect(screen.getByTestId('concern-input')).toHaveProp('placeholder', s.concernPlaceholder);
    await fireEvent.changeText(screen.getByTestId('concern-input'), 'squeaks');
    expect(disabled('book-services-next')).toBe(true);
    expect(screen.getByTestId('concern-error')).toHaveTextContent(s.concernTooShort(10));
    await fireEvent.changeText(screen.getByTestId('concern-input'), 'Brakes squeak');
    expect(screen.getByTestId('concern-counter')).toHaveTextContent('13/500');
    expect(screen.queryByTestId('concern-error')).toBeNull();
    expect(disabled('book-services-next')).toBe(false);
  });

  it('Custom mode: Next needs ≥ 1 service (the concern text does not count)', async () => {
    await openStep2();
    await fireEvent.changeText(screen.getByTestId('concern-input'), 'Brakes squeak badly');
    await fireEvent.press(screen.getByTestId('service-mode-custom'));
    const panel = await screen.findByTestId('custom-panel');
    expect(await within(panel).findByTestId('service-headlight')).toBeTruthy();
    expect(within(panel).getAllByRole('checkbox')).toHaveLength(8);
    expect(disabled('book-services-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('service-ac'));
    expect(screen.getByTestId('service-ac').props.accessibilityState).toMatchObject({ checked: true });
    expect(disabled('book-services-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('service-ac'));
    expect(disabled('book-services-next')).toBe(true);
  });

  it('Talk to Technician alone enables Next, makes the concern optional, and unselects on a second tap', async () => {
    await openStep2();
    await fireEvent.press(screen.getByTestId('talk-to-technician'));
    expect(screen.getByTestId('talk-to-technician').props.accessibilityState).toMatchObject({ checked: true });
    expect(disabled('book-services-next')).toBe(false);
    expect(screen.getByTestId('concern-optional')).toHaveTextContent(s.concernOptional);
    await fireEvent.changeText(screen.getByTestId('concern-input'), 'abc');
    expect(screen.queryByTestId('concern-error')).toBeNull(); // optional: no length hint
    await fireEvent.press(screen.getByTestId('service-mode-custom'));
    expect(disabled('book-services-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('talk-to-technician'));
    expect(screen.getByTestId('talk-to-technician').props.accessibilityState).toMatchObject({ checked: false });
    expect(disabled('book-services-next')).toBe(true);
  });

  it('voice UI (stub): Speak shows the mic card; the mic toggles listening; the language sheet; examples collapse', async () => {
    await openStep2();
    expect(screen.queryByTestId('voice-card')).toBeNull();
    await fireEvent.press(screen.getByTestId('concern-speak'));
    expect(screen.getByTestId('voice-card')).toHaveTextContent(new RegExp(s.tapToSpeak));
    await fireEvent.press(screen.getByTestId('voice-mic'));
    expect(screen.getByTestId('voice-card')).toHaveTextContent(new RegExp(s.listening));
    expect(screen.getByTestId('voice-unavailable')).toBeTruthy();
    await fireEvent.press(screen.getByTestId('voice-mic'));
    expect(screen.queryByTestId('voice-unavailable')).toBeNull();
    expect(screen.getByTestId('voice-language')).toHaveTextContent('English');
    await fireEvent.press(screen.getByTestId('voice-language'));
    await fireEvent.press(await screen.findByTestId('language-hi-IN'));
    await waitFor(() => expect(screen.getByTestId('voice-language')).toHaveTextContent('हिन्दी'));

    expect(screen.queryByTestId('concern-examples')).toBeNull();
    await fireEvent.press(screen.getByTestId('concern-examples-toggle'));
    expect(screen.getByTestId('concern-examples')).toHaveTextContent(/weird noise coming from the front side/);
    await fireEvent.press(screen.getByTestId('concern-examples-toggle'));
    expect(screen.queryByTestId('concern-examples')).toBeNull();
  });

  it('Back returns to Step 1 with the vehicle still chosen', async () => {
    await openStep2();
    await fireEvent.press(screen.getByTestId('book-services-back'));
    expect(await screen.findByTestId('book-vehicle')).toBeTruthy();
    expect(screen.getByTestId('book-vehicle-v-1').props.accessibilityState).toMatchObject({ checked: true });
  });
});

/** … → Step 2 (Talk to Technician) → Step 3. */
async function openStep3() {
  await openStep2();
  await fireEvent.press(screen.getByTestId('talk-to-technician'));
  await fireEvent.press(screen.getByTestId('book-services-next'));
  return screen.findByTestId('book-centre');
}

describe('Book a Service – Step 3 Choose Service Center', () => {
  const c = t.centre;
  const order = () => screen.getAllByTestId(/^centre-c-/).map(el => el.props.testID.replace('centre-', ''));

  it('lists the 12 mock centres (Found (12)) with badges, rating and distance; Next needs a choice', async () => {
    await openStep3();
    expect(screen.getByTestId('booking-stepper-3-current')).toBeTruthy();
    const first = await screen.findByTestId('centre-c-mg-gachibowli');
    expect(screen.getByTestId('centre-found')).toHaveTextContent(c.found(12));
    expect(order()).toHaveLength(12);
    expect(first).toHaveTextContent(/MG Service Center-Gachibowli/);
    expect(first).toHaveTextContent(new RegExp(`${c.badges.authorised}.*4\\.6 \\(320\\).*3\\.2 Km`));
    expect(first).toHaveProp('accessibilityRole', 'radio');
    expect(disabled('book-centre-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('centre-c-bosch-kondapur'));
    expect(screen.getByTestId('centre-c-bosch-kondapur').props.accessibilityState).toMatchObject({ checked: true });
    expect(disabled('book-centre-next')).toBe(false);
  });

  it('chips sort the list (single select): Nearest by distance, Top rated by rating', async () => {
    await openStep3();
    await screen.findByTestId('centre-c-mg-gachibowli');
    expect(order()[0]).toBe('c-mg-gachibowli');
    expect(screen.getByTestId('centre-sort-best').props.accessibilityState).toMatchObject({ checked: true });
    await fireEvent.press(screen.getByTestId('centre-sort-rating'));
    expect(order().slice(0, 2)).toEqual(['c-mg-kukatpally', 'c-mg-gachibowli']);
    expect(screen.getByTestId('centre-sort-best').props.accessibilityState).toMatchObject({ checked: false });
    await fireEvent.press(screen.getByTestId('centre-sort-nearest'));
    expect(order()[0]).toBe('c-mg-gachibowli');
    expect(order()[11]).toBe('c-mg-lbnagar');
  });

  it('search narrows the list; no match shows the empty state; a hidden choice disables Next', async () => {
    await openStep3();
    await fireEvent.press(await screen.findByTestId('centre-c-mg-gachibowli'));
    await fireEvent.changeText(screen.getByTestId('centre-search'), 'kondapur');
    expect(order()).toEqual(['c-bosch-kondapur']);
    expect(screen.getByTestId('centre-found')).toHaveTextContent(c.found(1));
    expect(disabled('book-centre-next')).toBe(true);
    await fireEvent.changeText(screen.getByTestId('centre-search'), 'zzz');
    expect(screen.getByTestId('centre-empty')).toHaveTextContent(new RegExp(c.emptyTitle));
    await fireEvent.press(screen.getByTestId('centre-clear'));
    expect(order()).toHaveLength(12);
    expect(disabled('book-centre-next')).toBe(false);
  });

  it('the filter sheet: distance + type, Apply filters the list and marks the button', async () => {
    await openStep3();
    await screen.findByTestId('centre-c-mg-gachibowli');
    await fireEvent.press(screen.getByTestId('centre-filter-open'));
    await fireEvent.press(await screen.findByTestId('filter-distance-10'));
    await fireEvent.press(screen.getByTestId('filter-type-authorised'));
    await fireEvent.press(screen.getByTestId('filter-apply'));
    await waitFor(() => expect(order()).toEqual(['c-mg-gachibowli', 'c-mahindra-hitec', 'c-mg-kukatpally', 'c-mahindra-jubilee']));
    expect(screen.getByTestId('centre-filter-dot')).toBeTruthy();
  });
});
