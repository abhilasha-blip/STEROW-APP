import {
  CONCERN_MAX_LENGTH,
  canContinueService,
  canSubmit,
  effectiveDrop,
  initialBookingValues,
  useBookingStore,
  type BookingValues,
} from '../booking.store';

const store = () => useBookingStore.getState();
const HOME = { id: 'a-home', line: 'Survey No. 112, Gachibowli, Hyderabad' };
const OFFICE = { id: 'a-office', line: 'Plot 7, Hitec City Phase 2, Hyderabad' };
const PHONE = '9876543210';

beforeEach(() => store().reset());

describe('Step 2 rules (canContinueService)', () => {
  const base = { serviceMode: 'concern' as const, concern: '', talkToTechnician: false, services: [] as string[] };

  it('Concern: needs ≥ 10 characters (trimmed)', () => {
    expect(canContinueService({ ...base, concern: 'too short' })).toBe(false);
    expect(canContinueService({ ...base, concern: '   123456789   ' })).toBe(false);
    expect(canContinueService({ ...base, concern: 'AC not cooling' })).toBe(true);
  });

  it('Custom: needs ≥ 1 service (a concern text does not count)', () => {
    expect(canContinueService({ ...base, serviceMode: 'custom', concern: 'AC not cooling' })).toBe(false);
    expect(canContinueService({ ...base, serviceMode: 'custom', services: ['ac'] })).toBe(true);
  });

  it('Talk to Technician: enough on its own in either mode', () => {
    expect(canContinueService({ ...base, talkToTechnician: true })).toBe(true);
    expect(canContinueService({ ...base, serviceMode: 'custom', talkToTechnician: true })).toBe(true);
  });

  it('Talk to Technician toggles (tapping again unselects); services toggle; concern is capped at 500', () => {
    store().toggleTalkToTechnician();
    expect(store().talkToTechnician).toBe(true);
    store().toggleTalkToTechnician();
    expect(store().talkToTechnician).toBe(false);
    store().toggleService('ac');
    store().toggleService('gear');
    store().toggleService('ac');
    expect(store().services).toEqual(['gear']);
    store().setConcern('x'.repeat(600));
    expect(store().concern).toHaveLength(CONCERN_MAX_LENGTH);
  });
});

describe('Step 4 pickup / drop state', () => {
  it('"Same as pickup" and "Confirm drop later" are mutually exclusive', () => {
    store().setPickupEnabled(true, PHONE);
    store().setDropEnabled(true, PHONE);
    expect(store().drop).toMatchObject({ sameAsPickup: true, confirmLater: false });
    store().setConfirmDropLater(true);
    expect(store().drop).toMatchObject({ sameAsPickup: false, confirmLater: true });
    store().setSameAsPickup(true);
    expect(store().drop).toMatchObject({ sameAsPickup: true, confirmLater: false });
    store().setSameAsPickup(false);
    expect(store().drop).toMatchObject({ sameAsPickup: false, confirmLater: false });
  });

  it('Drop without Pickup does not start as "same as pickup"; unticking Pickup clears it', () => {
    store().setDropEnabled(true, PHONE);
    expect(store().drop.sameAsPickup).toBe(false);
    store().setPickupEnabled(true, PHONE);
    store().setSameAsPickup(true);
    store().setPickupEnabled(false);
    expect(store().drop.sameAsPickup).toBe(false);
  });

  it('the phone defaults to the user\'s number but keeps an edited one', () => {
    store().setPickupEnabled(true, PHONE);
    expect(store().pickup.phone).toBe(PHONE);
    store().setPickupPhone('9000000001');
    store().setPickupEnabled(false);
    store().setPickupEnabled(true, PHONE);
    expect(store().pickup.phone).toBe('9000000001');
  });

  it('effectiveDrop mirrors the pickup when "Same as pickup"', () => {
    store().setPickupEnabled(true, PHONE);
    store().setPickupAddress(HOME);
    store().setDropEnabled(true, PHONE);
    expect(effectiveDrop(store())).toEqual({ address: HOME, phone: PHONE });
    store().setSameAsPickup(false);
    store().setDropAddress(OFFICE);
    expect(effectiveDrop(store()).address).toEqual(OFFICE);
  });

  it('addAddress keeps the session\'s new addresses; reset clears everything', () => {
    store().addAddress(OFFICE);
    store().setVehicle('v-1');
    expect(store().addresses).toEqual([OFFICE]);
    store().reset();
    expect({ ...store() }).toMatchObject(initialBookingValues);
  });
});

describe('Submit rules (canSubmit)', () => {
  const v = (over: Partial<BookingValues> = {}): BookingValues => ({
    ...initialBookingValues,
    date: '2026-11-25',
    slot: 'slot-9',
    ...over,
  });
  const pickup = (over = {}) => ({ enabled: true, address: HOME, phone: PHONE, ...over });
  const drop = (over = {}) => ({ enabled: true, sameAsPickup: false, confirmLater: false, address: OFFICE, phone: PHONE, ...over });

  it('needs a date and a slot', () => {
    expect(canSubmit(v())).toBe(true);
    expect(canSubmit(v({ date: null }))).toBe(false);
    expect(canSubmit(v({ slot: null }))).toBe(false);
  });

  it('Pickup ticked: needs an address and a valid phone', () => {
    expect(canSubmit(v({ pickup: pickup() }))).toBe(true);
    expect(canSubmit(v({ pickup: pickup({ address: null }) }))).toBe(false);
    expect(canSubmit(v({ pickup: pickup({ phone: '12345' }) }))).toBe(false);
  });

  it('Drop ticked: its own address + phone, or same as a valid pickup, or confirmed later', () => {
    expect(canSubmit(v({ drop: drop() }))).toBe(true);
    expect(canSubmit(v({ drop: drop({ address: null }) }))).toBe(false);
    expect(canSubmit(v({ drop: drop({ phone: '' }) }))).toBe(false);
    expect(canSubmit(v({ drop: drop({ address: null, confirmLater: true }) }))).toBe(true);
    expect(canSubmit(v({ pickup: pickup(), drop: drop({ address: null, sameAsPickup: true }) }))).toBe(true);
    expect(canSubmit(v({ pickup: pickup({ address: null }), drop: drop({ sameAsPickup: true }) }))).toBe(false);
    // "Same as pickup" without a pickup has nothing to mirror.
    expect(canSubmit(v({ drop: drop({ sameAsPickup: true }) }))).toBe(false);
  });

  it('unticked Pickup / Drop are not validated', () => {
    expect(canSubmit(v({ pickup: pickup({ enabled: false, address: null }), drop: drop({ enabled: false, address: null }) }))).toBe(true);
  });
});
