import { create } from 'zustand';
import type { CountryCode } from '@/constants/countries';
import type { Address } from '@/services/bookingService';
import { isValidMobile } from '@/utils/phone';

/**
 * Book a Service: everything the four steps collect, in one store (UI only; nothing is persisted).
 * Reset when the flow's stack unmounts and by "Book Another Service".
 */
export type ServiceMode = 'concern' | 'custom';

export type PickupState = {
  enabled: boolean;
  address: Address | null;
  /** National number (no dial code). */
  phone: string;
};

export type DropState = {
  enabled: boolean;
  /** Mirror the pickup address / phone (rows shown disabled). */
  sameAsPickup: boolean;
  /** Ask for the drop address after the service: the To Address rows are hidden and not required. */
  confirmLater: boolean;
  address: Address | null;
  phone: string;
};

export type BookingValues = {
  vehicleId: string | null;
  serviceMode: ServiceMode;
  concern: string;
  talkToTechnician: boolean;
  services: string[];
  centreId: string | null;
  /** yyyy-mm-dd (local). */
  date: string | null;
  slot: string | null;
  phoneCountry: CountryCode;
  pickup: PickupState;
  drop: DropState;
  /** Addresses added with "Add new address" during this booking. */
  addresses: Address[];
};

type BookingActions = {
  setVehicle: (vehicleId: string) => void;
  setServiceMode: (mode: ServiceMode) => void;
  setConcern: (concern: string) => void;
  /** A radio that unselects when tapped again. */
  toggleTalkToTechnician: () => void;
  toggleService: (serviceId: string) => void;
  setCentre: (centreId: string) => void;
  setDate: (date: string) => void;
  setSlot: (slot: string | null) => void;
  /** `defaultPhone`: the signed-in user's number, used when the phone is still empty. */
  setPickupEnabled: (enabled: boolean, defaultPhone?: string) => void;
  setPickupAddress: (address: Address) => void;
  setPickupPhone: (phone: string) => void;
  setDropEnabled: (enabled: boolean, defaultPhone?: string) => void;
  /** Exclusive with confirmLater: turning one on clears the other. */
  setSameAsPickup: (on: boolean) => void;
  setConfirmDropLater: (on: boolean) => void;
  setDropAddress: (address: Address) => void;
  setDropPhone: (phone: string) => void;
  setPhoneCountry: (country: CountryCode) => void;
  addAddress: (address: Address) => void;
  reset: () => void;
};

export type BookingState = BookingValues & BookingActions;

export const CONCERN_MIN_LENGTH = 10;
export const CONCERN_MAX_LENGTH = 500;
export const BOOKING_DAYS = 14;

const emptyPickup: PickupState = { enabled: false, address: null, phone: '' };
const emptyDrop: DropState = { enabled: false, sameAsPickup: false, confirmLater: false, address: null, phone: '' };

export const initialBookingValues: BookingValues = {
  vehicleId: null,
  serviceMode: 'concern',
  concern: '',
  talkToTechnician: false,
  services: [],
  centreId: null,
  date: null,
  slot: null,
  phoneCountry: 'IN',
  pickup: emptyPickup,
  drop: emptyDrop,
  addresses: [],
};

export const useBookingStore = create<BookingState>()((set, get) => ({
  ...initialBookingValues,
  setVehicle: vehicleId => set({ vehicleId }),
  setServiceMode: serviceMode => set({ serviceMode }),
  setConcern: concern => set({ concern: concern.slice(0, CONCERN_MAX_LENGTH) }),
  toggleTalkToTechnician: () => set({ talkToTechnician: !get().talkToTechnician }),
  toggleService: id => {
    const services = get().services;
    set({ services: services.includes(id) ? services.filter(s => s !== id) : [...services, id] });
  },
  setCentre: centreId => set({ centreId }),
  setDate: date => set({ date }),
  setSlot: slot => set({ slot }),
  setPickupEnabled: (enabled, defaultPhone = '') => {
    const { pickup, drop } = get();
    set({
      pickup: enabled ? { ...pickup, enabled, phone: pickup.phone || defaultPhone } : { ...pickup, enabled },
      // Nothing to mirror without a pickup.
      drop: enabled ? drop : { ...drop, sameAsPickup: false },
    });
  },
  setPickupAddress: address => set({ pickup: { ...get().pickup, address } }),
  setPickupPhone: phone => set({ pickup: { ...get().pickup, phone } }),
  setDropEnabled: (enabled, defaultPhone = '') => {
    const { pickup, drop } = get();
    set({
      drop: enabled
        ? {
            ...drop,
            enabled,
            // step4-1.svg: "Same as pickup address" starts ticked when there is a pickup.
            sameAsPickup: pickup.enabled && !drop.confirmLater,
            phone: drop.phone || defaultPhone,
          }
        : { ...drop, enabled },
    });
  },
  setSameAsPickup: on => {
    const drop = get().drop;
    set({ drop: { ...drop, sameAsPickup: on, confirmLater: on ? false : drop.confirmLater } });
  },
  setConfirmDropLater: on => {
    const drop = get().drop;
    set({ drop: { ...drop, confirmLater: on, sameAsPickup: on ? false : drop.sameAsPickup } });
  },
  setDropAddress: address => set({ drop: { ...get().drop, address } }),
  setDropPhone: phone => set({ drop: { ...get().drop, phone } }),
  setPhoneCountry: phoneCountry => set({ phoneCountry }),
  addAddress: address => set({ addresses: [...get().addresses, address] }),
  reset: () => set(initialBookingValues),
}));

export const __resetBookingStoreForTests = () => useBookingStore.getState().reset();

// ---- Rules (pure: the screens and the tests use the same functions) ----

/** Step 2 Next: Talk to Technician on, or ≥ 1 custom service, or a concern of ≥ 10 characters. */
export function canContinueService(v: Pick<BookingValues, 'serviceMode' | 'concern' | 'talkToTechnician' | 'services'>): boolean {
  if (v.talkToTechnician) {
    return true;
  }
  return v.serviceMode === 'custom' ? v.services.length > 0 : v.concern.trim().length >= CONCERN_MIN_LENGTH;
}

const pickupValid = (v: BookingValues) => !!v.pickup.address && isValidMobile(v.phoneCountry, v.pickup.phone);

/** Step 4 Submit: a date + slot, and every ticked Pickup / Drop has a usable address (or drop is confirmed later). */
export function canSubmit(v: BookingValues): boolean {
  if (!v.date || !v.slot) {
    return false;
  }
  if (v.pickup.enabled && !pickupValid(v)) {
    return false;
  }
  if (v.drop.enabled && !v.drop.confirmLater) {
    if (v.drop.sameAsPickup) {
      return v.pickup.enabled && pickupValid(v);
    }
    return !!v.drop.address && isValidMobile(v.phoneCountry, v.drop.phone);
  }
  return true;
}

/** The drop details as they'll be sent (mirrors the pickup when "Same as pickup"). */
export function effectiveDrop(v: BookingValues): { address: Address | null; phone: string } {
  return v.drop.sameAsPickup ? { address: v.pickup.address, phone: v.pickup.phone } : { address: v.drop.address, phone: v.drop.phone };
}
