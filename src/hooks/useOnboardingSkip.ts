import { useCallback } from 'react';
import { markOnboardingSkipped, type OnboardingSkipFlag } from '@/storage/onboardingFlags';
import { useAuthStore } from '@/store/auth.store';

/**
 * "Skip for now" on onboarding step 1 (DL) or 2 (vehicle): remembered per user on this device, so the
 * next launch doesn't route back to that step (see utils/startRoute). Fire-and-forget.
 */
export function useOnboardingSkip() {
  const uid = useAuthStore(s => s.user?.id);
  return useCallback(
    (flag: OnboardingSkipFlag) => {
      if (uid) {
        markOnboardingSkipped(flag, uid);
      }
    },
    [uid],
  );
}
