/** Where a signed-in user lands (after sign-in / sign-up, and at launch with a stored session). */
export type StartRoute = 'Step1Profile' | 'Step2DrivingLicence' | 'Step3Documents' | 'Dashboard';

export type StartRouteInput = {
  hasDrivingLicense: boolean;
  /** Rows in the vehicle-document tables (RC, insurance, PUC, FASTag) visible to the user. */
  documentCount: number;
  /** Local flags (storage/onboardingFlags). */
  profileDone: boolean;
  dlSkipped: boolean;
  documentsSkipped: boolean;
};

/**
 * 3-step onboarding:
 * - no DL row and 2/3 not skipped → 1/3 Profile, or 2/3 Driving Licence once the profile was done/skipped
 * - DL done or skipped, no documents and 3/3 not skipped → 3/3 Documents
 * - otherwise → Dashboard
 */
export function decideStartRoute(input: StartRouteInput): StartRoute {
  if (!input.hasDrivingLicense && !input.dlSkipped) {
    return input.profileDone ? 'Step2DrivingLicence' : 'Step1Profile';
  }
  if (input.documentCount === 0 && !input.documentsSkipped) {
    return 'Step3Documents';
  }
  return 'Dashboard';
}
