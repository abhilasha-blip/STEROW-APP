/** Central query-key factory. */
export const queryKeys = {
  bootstrap: (uid: string) => ['auth', 'bootstrap', uid] as const,
  /** Onboarding 1/4: saved profile + DL. */
  profileStep: (uid: string) => ['onboarding', 'profile-step', uid] as const,
} as const;
