import { create } from 'zustand';
import type { DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import {
  EMPTY_SERVICE,
  EMPTY_VEHICLE,
  resolveDocuments,
  type OnboardingValues,
  type ProfileFormValues,
  type ServiceFormValues,
  type StoredDocuments,
  type VehicleEntryMode,
  type VehicleFormValues,
} from '@/screens/onboarding/schemas';
import { resolveMimeType, type UploadedFile } from '@/utils/uploadFile';

/**
 * One in-memory store for the whole onboarding flow. Each step keeps its own react-hook-form and
 * mirrors every change here, so a step that is left and re-entered (Back, then Next) starts from
 * what was entered. No persistence and no API yet; cleared when the onboarding stack unmounts.
 */
type OnboardingState = {
  profile: ProfileFormValues | null;
  vehicle: VehicleFormValues;
  vehicleMode: VehicleEntryMode;
  documents: StoredDocuments;
  service: ServiceFormValues;
  setProfile: (profile: ProfileFormValues) => void;
  setVehicle: (vehicle: VehicleFormValues) => void;
  setVehicleMode: (mode: VehicleEntryMode) => void;
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

export const useOnboardingStore = create<OnboardingState>()(set => ({
  ...initial,
  setProfile: profile => set({ profile }),
  setVehicle: vehicle => set({ vehicle }),
  setVehicleMode: vehicleMode => set({ vehicleMode }),
  setDocument: (key, file) => set(s => ({ documents: { ...s.documents, [key]: file } })),
  setService: service => set({ service }),
  reset: () => set(initial),
}));

type Snapshot = Pick<OnboardingState, 'profile' | 'vehicle' | 'vehicleMode' | 'documents' | 'service'>;

/** Step 1 only keeps the DL photo's uri; step 3 shows it as an attached licence. */
export function profileDlAsFile(profile: ProfileFormValues | null): UploadedFile | null {
  const uri = profile?.dlImageUri;
  if (!uri) {
    return null;
  }
  return {
    uri,
    name: strings.onboarding.documents.licenseFromStep1,
    mimeType: resolveMimeType({ uri }) ?? 'image/jpeg',
  };
}

export const selectResolvedDocuments = (s: Snapshot) =>
  resolveDocuments(s.documents, { vehicleRc: s.vehicle.rcFile, profileDl: profileDlAsFile(s.profile) });

export const selectOnboardingValues = (s: Snapshot): OnboardingValues => ({
  profile: s.profile,
  vehicle: { ...s.vehicle, entryMode: s.vehicleMode },
  documents: selectResolvedDocuments(s),
  service: s.service,
});

export const __resetOnboardingStoreForTests = () => useOnboardingStore.getState().reset();
