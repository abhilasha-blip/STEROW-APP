/** Where a signed-in user lands (after sign-in / sign-up, and at launch with a stored session). */
export type StartRoute = 'Step1Profile' | 'Step2DrivingLicence' | 'Step3Documents' | 'Dashboard';

export type StartRouteInput = {
  hasDrivingLicense: boolean;
  /** Active vehicles (3/3 creates one; documents belong to it). */
  vehicleCount: number;
  /** Local flags (storage/onboardingFlags). */
  profileDone: boolean;
  dlSkipped: boolean;
  documentsSkipped: boolean;
};

/**
 * 3-step onboarding:
 * - no DL row and 2/3 not skipped → 1/3 Profile, or 2/3 Driving Licence once the profile was done/skipped
 * - DL done or skipped, no active vehicle and 3/3 not skipped → 3/3 Vehicle documents
 * - otherwise → Dashboard
 */
export function decideStartRoute(input: StartRouteInput): StartRoute {
  if (!input.hasDrivingLicense && !input.dlSkipped) {
    return input.profileDone ? 'Step2DrivingLicence' : 'Step1Profile';
  }
  if (input.vehicleCount === 0 && !input.documentsSkipped) {
    return 'Step3Documents';
  }
  return 'Dashboard';
}
