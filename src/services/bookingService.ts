/**
 * Book a Service: the typed interface the screens use. Every call returns the UI-only mock in
 * src/constants/bookServiceMock.ts today; wiring the API later only changes the bodies below (the
 * screens, hooks and store don't change). The user's vehicles are NOT here: they are real
 * (useMyVehicles).
 */
import type { ImageSourcePropType } from 'react-native';
import {
  MOCK_CENTRES,
  MOCK_CONCERN_EXAMPLES,
  MOCK_SAVED_ADDRESSES,
  MOCK_SERVICES,
  MOCK_TIME_SLOTS,
  MOCK_VOICE_LANGUAGES,
} from '@/constants/bookServiceMock';

/** Icon keys map to the extracted SVGs in src/assets/icons/book-service (see ServiceRow). */
export type ServiceIconKey = 'headlight' | 'brakePads' | 'gear' | 'bumper' | 'battery' | 'ac' | 'engine' | 'tyre';

export type ServiceItem = { id: string; title: string; subtitle: string; icon: ServiceIconKey };

export type CentreBadge = 'authorised' | 'certified' | 'multiBrand';

export type ServiceCentre = {
  id: string;
  name: string;
  address: string;
  /** A bundled logo (mock) or, later, a remote one. */
  logo: ImageSourcePropType;
  badges: CentreBadge[];
  rating: number;
  ratingCount: number;
  distanceKm: number;
};

export type TimeSlot = {
  id: string;
  label: string;
  /** 24h start / end hours: a slot that already started today can't be booked. */
  startHour: number;
  endHour: number;
};

export type Address = { id: string; label?: string; line: string };

export type VoiceLanguage = { code: string; label: string };

export type BookingRequest = {
  vehicleId: string;
  serviceMode: 'concern' | 'custom' | null;
  concern: string;
  talkToTechnician: boolean;
  services: string[];
  centreId: string;
  /** yyyy-mm-dd (local). */
  date: string;
  slotId: string;
  pickup: { addressLine: string; phone: string } | null;
  /** null: no drop. `confirmLater`: the address is asked for after the service. */
  drop: { addressLine: string; phone: string } | { confirmLater: true } | null;
};

export type BookingResult = { id: string };

/** Simulated latency so the loading states show (tests set it to 0). */
let latencyMs = 300;
export const __setBookingLatencyForTests = (ms: number) => {
  latencyMs = ms;
};
const later = <T,>(value: T) => new Promise<T>(resolve => setTimeout(() => resolve(value), latencyMs));

export const bookingService = {
  listServices: (): Promise<ServiceItem[]> => later(MOCK_SERVICES),
  listCentres: (): Promise<ServiceCentre[]> => later(MOCK_CENTRES),
  listTimeSlots: (): Promise<TimeSlot[]> => later(MOCK_TIME_SLOTS),
  listSavedAddresses: (): Promise<Address[]> => later(MOCK_SAVED_ADDRESSES),
  /** Example prompts for the concern box (the collapsible hint). */
  concernExamples: (): readonly string[] => MOCK_CONCERN_EXAMPLES,
  voiceLanguages: (): readonly VoiceLanguage[] => MOCK_VOICE_LANGUAGES,
  /** UI-only: nothing is stored, and the dashboard's real booking count is unaffected. */
  createBooking: (_request: BookingRequest): Promise<BookingResult> => later({ id: `mock-${Date.now()}` }),
};

export type BookingService = typeof bookingService;
