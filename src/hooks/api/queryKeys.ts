/** Central query-key factory. */
export const queryKeys = {
  bootstrap: (uid: string) => ['auth', 'bootstrap', uid] as const,
} as const;
