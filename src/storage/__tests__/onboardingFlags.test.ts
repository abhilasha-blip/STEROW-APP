import * as Keychain from 'react-native-keychain';
import {
  isOnboardingSkipped,
  markOnboardingSkipped,
  onboardingFlagKey,
} from '@/storage/onboardingFlags';

describe('onboarding skip flags', () => {
  it('per flag and per user', async () => {
    expect(onboardingFlagKey('profile', 'u1')).toBe('onboarding-profile-done:u1');
    expect(onboardingFlagKey('dl', 'u1')).toBe('onboarding-dl-skipped:u1');
    expect(onboardingFlagKey('documents', 'u1')).toBe('onboarding-documents-skipped:u1');
    expect(await isOnboardingSkipped('dl', 'u1')).toBe(false);
    await markOnboardingSkipped('dl', 'u1');
    expect(await isOnboardingSkipped('dl', 'u1')).toBe(true);
    expect(await isOnboardingSkipped('documents', 'u1')).toBe(false);
    expect(await isOnboardingSkipped('dl', 'u2')).toBe(false);
  });

  it('read / write failures are swallowed (not skipped; skip still proceeds)', async () => {
    jest.mocked(Keychain.getGenericPassword).mockRejectedValueOnce(new Error('locked'));
    await expect(isOnboardingSkipped('dl', 'u1')).resolves.toBe(false);
    jest.mocked(Keychain.setGenericPassword).mockRejectedValueOnce(new Error('locked'));
    await expect(markOnboardingSkipped('dl', 'u1')).resolves.toBeUndefined();
  });
});
