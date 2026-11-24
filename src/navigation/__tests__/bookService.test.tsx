import { fireEvent, screen, waitFor, within } from '@testing-library/react-native';
import { getSupabase, __resetSupabaseForTests } from '@/api/supabase';
import { strings } from '@/constants/strings';
import { __resetBookingStoreForTests, useBookingStore } from '@/store/booking.store';
import { toIsoDate } from '@/utils/bookingDates';
import { makeSession, resetMyVehicles, setOnboardingBackend, vehicleRow } from '../../../test/msw/fixtures';
import { renderApp, resetAppState } from '../../../test/render';

beforeEach(() => {
  resetAppState();
  __resetBookingStoreForTests(); // before mounting: a reset under a mounted screen re-renders outside act()
});
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

const tomorrow = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toIsoDate(d);
};

/** … → Step 3 (first centre) → Step 4. */
async function openStep4() {
  await openStep3();
  await fireEvent.press(await screen.findByTestId('centre-c-mg-gachibowli'));
  await fireEvent.press(screen.getByTestId('book-centre-next'));
  return screen.findByTestId('book-slot');
}

/** Tomorrow + the first slot (avoids today's already-started slots). */
async function pickDateAndSlot() {
  await fireEvent.press(screen.getByTestId(`date-${tomorrow()}`));
  await fireEvent.press(await screen.findByTestId('slot-slot-9'));
}

async function pickAddress(sheetOpener: string, optionId = 'a-home') {
  await fireEvent.press(screen.getByTestId(sheetOpener));
  await fireEvent.press(await screen.findByTestId(`address-sheet-option-${optionId}`));
}

describe('Book a Service – Step 4 Slot & Pickup/Drop', () => {
  const s = t.slot;
  const checked = (id: string) => screen.getByTestId(id).props.accessibilityState?.checked;

  it('14 date chips from today (no past dates), 3 slots; Submit needs a date and a slot', async () => {
    await openStep4();
    expect(screen.getByTestId('booking-stepper-4-current')).toBeTruthy();
    expect(screen.getByTestId('booking-stepper-3-done')).toBeTruthy();
    const days = screen.getAllByTestId(/^date-\d{4}-/);
    expect(days).toHaveLength(14);
    expect(days[0].props.testID).toBe(`date-${toIsoDate(new Date())}`);
    expect(await screen.findAllByTestId(/^slot-slot-/)).toHaveLength(3);
    expect(screen.getByTestId('slot-slot-9')).toHaveTextContent('9 am - 11 am');
    expect(disabled('book-slot-next')).toBe(true);
    await fireEvent.press(screen.getByTestId(`date-${tomorrow()}`));
    expect(checked(`date-${tomorrow()}`)).toBe(true);
    expect(disabled('book-slot-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('slot-slot-11'));
    await fireEvent.press(screen.getByTestId('slot-slot-14'));
    expect(checked('slot-slot-11')).toBe(false); // single select
    expect(checked('slot-slot-14')).toBe(true);
    expect(disabled('book-slot-next')).toBe(false);
  });

  it('neither ticked: no address fields', async () => {
    await openStep4();
    expect(screen.queryByTestId('pickup-section')).toBeNull();
    expect(screen.queryByTestId('drop-section')).toBeNull();
    expect(screen.getByTestId('pickup-toggle')).toHaveProp('accessibilityRole', 'checkbox');
  });

  it('Pickup only: From Address + Change + phone (the user\'s number); Submit needs the address', async () => {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('pickup-toggle'));
    const section = screen.getByTestId('pickup-section');
    expect(section).toHaveTextContent(new RegExp(`${s.fromAddress}.*\\(Pickup Location\\).*${s.change}`));
    expect(screen.getByTestId('pickup-address')).toHaveTextContent(s.selectAddress); // mock never pre-filled
    expect(screen.getByTestId('pickup-phone').props.value).toBe('9999999999');
    expect(disabled('book-slot-next')).toBe(true);
    await pickAddress('pickup-change');
    await waitFor(() => expect(screen.getByTestId('pickup-address')).toHaveTextContent(/Gachibowli/));
    expect(disabled('book-slot-next')).toBe(false);
    await fireEvent.changeText(screen.getByTestId('pickup-phone'), '12345');
    expect(screen.getByTestId('pickup-phone-error')).toHaveTextContent(s.phoneInvalid);
    expect(disabled('book-slot-next')).toBe(true);
  });

  it('Pickup + Drop, "Same as pickup" (default): drop rows mirror the pickup and are disabled', async () => {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('pickup-toggle'));
    await pickAddress('pickup-address');
    await fireEvent.press(screen.getByTestId('drop-toggle'));
    expect(screen.getByTestId('drop-section')).toHaveTextContent(new RegExp(`${s.toAddress}.*\\(Drop Location\\)`));
    expect(checked('drop-same')).toBe(true);
    expect(checked('drop-later')).toBe(false);
    expect(screen.getByTestId('drop-address')).toHaveTextContent(/Gachibowli/);
    expect(screen.getByTestId('drop-address').props.accessibilityState).toMatchObject({ disabled: true });
    expect(screen.getByTestId('drop-phone').props.editable).toBe(false);
    expect(screen.getByTestId('drop-phone').props.value).toBe('9999999999');
    expect(screen.queryByTestId('drop-change')).toBeNull();
    expect(disabled('book-slot-next')).toBe(false);
  });

  it('Pickup + Drop, own drop address: editable rows; Submit needs the drop address', async () => {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('pickup-toggle'));
    await pickAddress('pickup-address');
    await fireEvent.press(screen.getByTestId('drop-toggle'));
    await fireEvent.press(screen.getByTestId('drop-same'));
    expect(screen.getByTestId('drop-phone').props.editable).toBe(true);
    expect(screen.getByTestId('drop-address')).toHaveTextContent(s.selectAddress);
    expect(disabled('book-slot-next')).toBe(true);
    await pickAddress('drop-change', 'a-office');
    await waitFor(() => expect(screen.getByTestId('drop-address')).toHaveTextContent(/Hitec City/));
    expect(disabled('book-slot-next')).toBe(false);
  });

  it('"Confirm drop later" and "Same as pickup" are exclusive; confirm-later hides the To Address rows', async () => {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('pickup-toggle'));
    await pickAddress('pickup-address');
    await fireEvent.press(screen.getByTestId('drop-toggle'));
    expect(checked('drop-same')).toBe(true);
    await fireEvent.press(screen.getByTestId('drop-later'));
    expect(checked('drop-later')).toBe(true);
    expect(checked('drop-same')).toBe(false);
    expect(screen.queryByTestId('drop-fields')).toBeNull();
    expect(screen.getByTestId('drop-later-help')).toHaveTextContent(s.confirmDropLaterHelp);
    expect(disabled('book-slot-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('drop-same'));
    expect(checked('drop-same')).toBe(true);
    expect(checked('drop-later')).toBe(false);
    expect(screen.getByTestId('drop-fields')).toBeTruthy();
    expect(screen.queryByTestId('drop-later-help')).toBeNull();
  });

  it('Drop only: no "Same as pickup"; needs its own address, or confirm later', async () => {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('drop-toggle'));
    expect(screen.queryByTestId('drop-same')).toBeNull();
    expect(disabled('book-slot-next')).toBe(true);
    await fireEvent.press(screen.getByTestId('drop-later'));
    expect(disabled('book-slot-next')).toBe(false);
    await fireEvent.press(screen.getByTestId('drop-later'));
    expect(disabled('book-slot-next')).toBe(true);
    await pickAddress('drop-address');
    await waitFor(() => expect(disabled('book-slot-next')).toBe(false));
  });

  it('"Add new address": the text field + map placeholder; Save selects it', async () => {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('pickup-toggle'));
    await fireEvent.press(screen.getByTestId('pickup-change'));
    await fireEvent.press(await screen.findByTestId('address-sheet-add'));
    expect(screen.getByLabelText(t.address.mapPlaceholder)).toBeTruthy();
    await fireEvent.changeText(screen.getByTestId('address-sheet-new-input'), 'short');
    expect(disabled('address-sheet-new-save')).toBe(true);
    await fireEvent.changeText(screen.getByTestId('address-sheet-new-input'), '  Flat 4B,  Lake View, Kondapur ');
    await fireEvent.press(screen.getByTestId('address-sheet-new-save'));
    await waitFor(() => expect(screen.getByTestId('pickup-address')).toHaveTextContent('Flat 4B, Lake View, Kondapur'));
    expect(useBookingStore.getState().addresses).toHaveLength(1);
    expect(disabled('book-slot-next')).toBe(false);
  });
});

describe('Book a Service – Congratulations', () => {
  async function book() {
    await openStep4();
    await pickDateAndSlot();
    await fireEvent.press(screen.getByTestId('book-slot-next'));
    return screen.findByTestId('booking-success');
  }

  it('shows the check, title, one line and EXACTLY two buttons (no back arrow, no summary)', async () => {
    const success = await book();
    expect(within(success).getByText(t.success.title)).toBeTruthy();
    expect(within(success).getByText(t.success.body)).toBeTruthy();
    expect(within(success).getByTestId('booking-success-illustration')).toBeTruthy();
    const buttons = within(success).getAllByRole('button');
    expect(buttons.map(b => b.props.accessibilityLabel)).toEqual([t.success.myBookings, t.success.bookAnother]);
    expect(within(success).queryByTestId('light-screen-back')).toBeNull();
    expect(within(success).queryByText(/MG Service Center|9 am/)).toBeNull();
    expect(screen.queryByTestId('book-slot')).toBeNull(); // the flow is gone from the stack
  });

  it('"Go to My Bookings" opens the empty placeholder; Back returns to the dashboard', async () => {
    await book();
    await fireEvent.press(screen.getByTestId('booking-success-my-bookings'));
    expect(await screen.findByTestId('my-bookings-empty')).toHaveTextContent(new RegExp(strings.myBookings.emptyTitle));
    await fireEvent.press(screen.getByTestId('light-screen-back'));
    expect(await screen.findByTestId('dashboard')).toBeTruthy();
    expect(screen.queryByTestId('booking-success')).toBeNull();
    // UI-only booking: the dashboard keeps the REAL count (no fake booking appears).
    expect(screen.getByTestId('tile-book-service')).toHaveTextContent(new RegExp(strings.dashboard.records('0')));
  });

  it('"Book Another Service" resets the booking and starts at Step 1', async () => {
    await book();
    await fireEvent.press(screen.getByTestId('booking-success-book-another'));
    expect(await screen.findByTestId('book-vehicle')).toBeTruthy();
    expect(screen.getByTestId('booking-stepper-1-current')).toBeTruthy();
    expect(useBookingStore.getState()).toMatchObject({ vehicleId: null, centreId: null, date: null, slot: null, talkToTechnician: false });
    expect(screen.getByTestId('book-vehicle-v-1').props.accessibilityState).toMatchObject({ checked: false });
  });
});
