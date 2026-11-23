import { create } from 'zustand';
import type { DocumentKey } from '@/constants/onboarding';
import {
  EMPTY_DOCUMENTS,
  type DocumentsFormValues,
  type DrivingLicenceFormValues,
  type OnboardingValues,
  type ProfileFormValues,
} from '@/screens/onboarding/schemas';
import type { UploadedFile } from '@/utils/uploadFile';

/**
 * In-memory values of the 3 onboarding steps. Each step keeps its own react-hook-form and mirrors every
 * change here, so a step left with Back and re-entered starts from what was entered (1/3 and 2/3 are
 * also saved to the backend on Next). Cleared when the onboarding stack unmounts and on sign-out.
 */
type OnboardingState = {
  profile: ProfileFormValues | null;
  drivingLicence: DrivingLicenceFormValues | null;
  documents: DocumentsFormValues;
  setProfile: (profile: ProfileFormValues) => void;
  setDrivingLicence: (drivingLicence: DrivingLicenceFormValues) => void;
  setDocument: (key: DocumentKey, file: UploadedFile | null) => void;
  reset: () => void;
};

const initial = { profile: null, drivingLicence: null, documents: EMPTY_DOCUMENTS };

export const useOnboardingStore = create<OnboardingState>()(set => ({
  ...initial,
  setProfile: profile => set({ profile }),
  setDrivingLicence: drivingLicence => set({ drivingLicence }),
  setDocument: (key, file) => set(s => ({ documents: { ...s.documents, [key]: file } })),
  reset: () => set(initial),
}));

export const selectOnboardingValues = (s: OnboardingState): OnboardingValues => ({
  profile: s.profile,
  drivingLicence: s.drivingLicence,
  documents: s.documents,
});

export const __resetOnboardingStoreForTests = () => useOnboardingStore.getState().reset();
