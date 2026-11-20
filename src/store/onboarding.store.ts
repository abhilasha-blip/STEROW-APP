import { create } from 'zustand';
import type { DocumentKey } from '@/constants/onboarding';
import type { VehicleLookupResult } from '@/constants/vehicleMock';
import {
  EMPTY_SERVICE,
  EMPTY_VEHICLE,
  EMPTY_VEHICLE_DETAILS,
  resolveDocuments,
  type OnboardingValues,
  type ProfileFormValues,
  type ServiceFormValues,
  type StoredDocuments,
  type VehicleEntryMode,
  type VehicleFormValues,
} from '@/screens/onboarding/schemas';
import type { UploadedFile } from '@/utils/uploadFile';

/**
 * One in-memory store for the whole onboarding flow. Each step keeps its own react-hook-form and
 * mirrors every change here, so a step that is left and re-entered (Back, then Next) starts from
 * what was entered. No persistence and no API yet; cleared when the onboarding stack unmounts.
 */
export type VehicleEntry = Pick<VehicleFormValues, 'vehicleNumber' | 'rcFile'>;

const hasDetails = (v: VehicleFormValues) =>
  (Object.keys(EMPTY_VEHICLE_DETAILS) as (keyof typeof EMPTY_VEHICLE_DETAILS)[]).some(k => !!v[k]);

type OnboardingState = {
  profile: ProfileFormValues | null;
  vehicle: VehicleFormValues;
  vehicleMode: VehicleEntryMode;
  documents: StoredDocuments;
  service: ServiceFormValues;
  setProfile: (profile: ProfileFormValues) => void;
  setVehicle: (vehicle: VehicleFormValues) => void;
  setVehicleMode: (mode: VehicleEntryMode) => void;
  /** Step 2 entry screen: the typed number / RC. A different number drops the details of the old one. */
  setVehicleEntry: (entry: VehicleEntry) => void;
  /**
   * Step 2 entry "Next": the form opens prefilled. Details already in the store for this number (an
   * earlier visit to the form) are kept; otherwise the lookup result fills them.
   */
  prefillVehicleFromEntry: (entry: VehicleEntry, lookup: VehicleLookupResult | null) => void;
  /** Step 2 "Add your vehicle details manually": an empty form (the RC stays attached for step 3). */
  startManualVehicle: () => void;
  setDocument: (key: DocumentKey, file: UploadedFile | null) => void;
  setService: (service: ServiceFormValues) => void;
  reset: () => void;
};

const initial = {
  profile: null,
  vehicle: EMPTY_VEHICLE,
  vehicleMode: 'lookup' as VehicleEntryMode,
  documents: {},
  service: EMPTY_SERVICE,
};

export const useOnboardingStore = create<OnboardingState>()((set, get) => ({
  ...initial,
  setProfile: profile => set({ profile }),
  setVehicle: vehicle => set({ vehicle }),
  setVehicleMode: vehicleMode => set({ vehicleMode }),
  setVehicleEntry: ({ vehicleNumber, rcFile }) =>
    set(({ vehicle }) => ({
      vehicle:
        vehicleNumber === vehicle.vehicleNumber
          ? { ...vehicle, rcFile }
          : { ...vehicle, ...EMPTY_VEHICLE_DETAILS, vehicleNumber, rcFile },
    })),
  prefillVehicleFromEntry: (entry, lookup) => {
    get().setVehicleEntry(entry);
    set(({ vehicle }) => ({
      vehicle: hasDetails(vehicle) || !lookup ? vehicle : { ...vehicle, ...lookup },
      vehicleMode: lookup ? 'lookup' : 'rc',
    }));
  },
  startManualVehicle: () =>
    set(({ vehicle }) => ({ vehicle: { ...EMPTY_VEHICLE, rcFile: vehicle.rcFile }, vehicleMode: 'manual' })),
  setDocument: (key, file) => set(s => ({ documents: { ...s.documents, [key]: file } })),
  setService: service => set({ service }),
  reset: () => set(initial),
}));

type Snapshot = Pick<OnboardingState, 'profile' | 'vehicle' | 'vehicleMode' | 'documents' | 'service'>;

export const selectResolvedDocuments = (s: Snapshot) =>
  resolveDocuments(s.documents, { vehicleRc: s.vehicle.rcFile });

export const selectOnboardingValues = (s: Snapshot): OnboardingValues => ({
  profile: s.profile,
  vehicle: { ...s.vehicle, entryMode: s.vehicleMode },
  documents: selectResolvedDocuments(s),
  service: s.service,
});

export const __resetOnboardingStoreForTests = () => useOnboardingStore.getState().reset();
