/** Central query-key factory. */
export const queryKeys = {
  bootstrap: (uid: string) => ['auth', 'bootstrap', uid] as const,
  /** Onboarding 1/3: saved profile. */
  profileStep: (uid: string) => ['onboarding', 'profile-step', uid] as const,
  /** Onboarding 2/3: saved driving licence. */
  drivingLicenceStep: (uid: string) => ['onboarding', 'driving-licence-step', uid] as const,
  /** Vehicle master data (make + model + variant), the same for everyone. */
  vehicleModels: () => ['master', 'vehicle-models'] as const,
  vehicleCatalog: () => ['master', 'vehicle-catalog'] as const,
  /** The signed-in user's active vehicles. */
  myVehicles: (uid: string) => ['vehicles', 'mine', uid] as const,
  /** Document rows per vehicle (My Documents, dashboard counts). */
  vehicleDocuments: (uid: string) => ['vehicles', 'documents', uid] as const,
  dashboardCounts: (uid: string) => ['dashboard', 'counts', uid] as const,
  /** Shares on the user's own vehicles (Share Access). */
  sharedPeople: (uid: string) => ['shares', 'people', uid] as const,
  /** Book a Service (UI-only mock today, see src/services/bookingService.ts). */
  bookingServices: () => ['booking', 'services'] as const,
  serviceCentres: () => ['booking', 'centres'] as const,
  timeSlots: () => ['booking', 'slots'] as const,
  savedAddresses: () => ['booking', 'addresses'] as const,
} as const;
