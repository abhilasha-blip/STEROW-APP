/** Where a signed-in user lands (after sign-in / sign-up, and at launch with a stored session). */
export type StartRoute = 'Step1Profile' | 'Step2Vehicle' | 'Dashboard';

export type StartRouteInput = {
  hasDrivingLicense: boolean;
  vehicleCount: number;
  /** Local "Skip for now" flags (storage/onboardingFlags). */
  dlSkipped: boolean;
  vehicleSkipped: boolean;
};

/**
 * - no DL row and step 1 not skipped               → onboarding 1/4
 * - DL done or skipped, no vehicle, step 2 not skipped → onboarding 2/4
 * - otherwise                                      → Dashboard
 */
export function decideStartRoute(input: StartRouteInput): StartRoute {
  if (!input.hasDrivingLicense && !input.dlSkipped) {
    return 'Step1Profile';
  }
  if (input.vehicleCount === 0 && !input.vehicleSkipped) {
    return 'Step2Vehicle';
  }
  return 'Dashboard';
}
