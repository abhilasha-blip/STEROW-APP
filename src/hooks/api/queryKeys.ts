/** Central query-key factory. */
export const queryKeys = {
  bootstrap: (uid: string) => ['auth', 'bootstrap', uid] as const,
  /** Onboarding 1/3: saved profile. */
  profileStep: (uid: string) => ['onboarding', 'profile-step', uid] as const,
  /** Onboarding 2/3: saved driving licence. */
  drivingLicenceStep: (uid: string) => ['onboarding', 'driving-licence-step', uid] as const,
  /** Vehicle master data (make + model + variant), the same for everyone. */
  vehicleModels: () => ['master', 'vehicle-models'] as const,
} as const;
