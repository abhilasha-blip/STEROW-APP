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
  /** Documents per vehicle (profile completion); under vehicleDocuments so document saves refresh it. */
  vehicleDocumentCounts: (uid: string, vehicleIds: readonly string[]) =>
    ['vehicles', 'documents', uid, 'counts', vehicleIds.join(',')] as const,
  dashboardCounts: (uid: string) => ['dashboard', 'counts', uid] as const,
  /** Shares on the user's own vehicles (Share Access). */
  sharedPeople: (uid: string) => ['shares', 'people', uid] as const,
} as const;

/**
 * Everything profile completion reads (dashboard badge/ring, My Profile "x% Completed"): profile, licence,
 * vehicles and their documents, plus the dashboard counts. Invalidated after every save and on focus.
 */
export const profileCompletionKeys = (uid: string) =>
  [
    queryKeys.profileStep(uid),
    queryKeys.drivingLicenceStep(uid),
    queryKeys.myVehicles(uid),
    queryKeys.vehicleDocuments(uid),
    queryKeys.dashboardCounts(uid),
  ] as const;
