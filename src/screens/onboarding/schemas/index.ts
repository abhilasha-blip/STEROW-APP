import type { ProfileFormValues } from './profile.schema';
import type { DocumentsFormValues } from './documents.schema';
import type { ServiceFormValues } from './service.schema';
import type { VehicleEntryMode, VehicleFormValues } from './vehicle.schema';

export * from './documents.schema';
export * from './profile.schema';
export * from './service.schema';
export * from './vehicle.schema';

/** Everything collected in onboarding (handed to onComplete; the API takes it from here). */
export type OnboardingValues = {
  profile: ProfileFormValues | null;
  vehicle: VehicleFormValues & { entryMode: VehicleEntryMode };
  documents: DocumentsFormValues;
  service: ServiceFormValues;
};
