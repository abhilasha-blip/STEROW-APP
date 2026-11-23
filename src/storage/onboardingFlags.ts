import * as Keychain from 'react-native-keychain';
import { logger } from '@/utils/logger';

/**
 * Per-user "Skip for now" flags for onboarding, kept on this device only (the web keeps the same
 * kind of flag in localStorage: `dl-skipped:<uid>`). Not secrets: stored with react-native-keychain,
 * which the app already ships, one service per flag and user, so sign-out never touches them.
 *
 *   onboarding-profile-done:<uid>       1/3 profile saved or skipped (no backend "done" signal)
 *   onboarding-dl-skipped:<uid>         2/3 driving licence skipped
 *   onboarding-documents-skipped:<uid>  3/3 documents skipped
 */
export type OnboardingSkipFlag = 'profile' | 'dl' | 'documents';

const ACCOUNT = 'sterow';
const SET = '1';

export const onboardingFlagKey = (flag: OnboardingSkipFlag, uid: string) =>
  flag === 'profile' ? `onboarding-profile-done:${uid}` : `onboarding-${flag}-skipped:${uid}`;

export async function isOnboardingSkipped(flag: OnboardingSkipFlag, uid: string): Promise<boolean> {
  try {
    const result = await Keychain.getGenericPassword({ service: onboardingFlagKey(flag, uid) });
    return !!result && result.password === SET;
  } catch (e) {
    // Unreadable → not skipped: the worst case is showing the step again.
    logger.warn('onboarding flag read failed', {
      flag,
      error: e instanceof Error ? e.message : String(e),
    });
    return false;
  }
}

export async function markOnboardingSkipped(flag: OnboardingSkipFlag, uid: string): Promise<void> {
  try {
    await Keychain.setGenericPassword(ACCOUNT, SET, {
      service: onboardingFlagKey(flag, uid),
      accessible: Keychain.ACCESSIBLE.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });
  } catch (e) {
    // Best-effort: the skip still works now; the step may be offered again at the next launch.
    logger.warn('onboarding flag write failed', {
      flag,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}
