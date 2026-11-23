import type { DocumentsFormValues } from './documents.schema';
import type { DrivingLicenceFormValues } from './drivingLicence.schema';
import type { ProfileFormValues } from './profile.schema';

export * from './documents.schema';
export * from './drivingLicence.schema';
export * from './profile.schema';
export * from './vehicle.schema';

/** Everything collected in onboarding (1/3 profile, 2/3 driving licence, 3/3 documents). */
export type OnboardingValues = {
  profile: ProfileFormValues | null;
  drivingLicence: DrivingLicenceFormValues | null;
  documents: DocumentsFormValues;
};
