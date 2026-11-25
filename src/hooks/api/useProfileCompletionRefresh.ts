import { useCallback, useRef } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import { profileCompletionKeys } from './queryKeys';

/** Refetch what profile completion reads (call after any profile / licence / vehicle / document save). */
export function invalidateProfileCompletion(queryClient: QueryClient, uid: string): Promise<void> {
  return Promise.all(
    profileCompletionKeys(uid).map(queryKey => queryClient.invalidateQueries({ queryKey })),
  ).then(() => undefined);
}

/**
 * Refetch the profile-completion queries each time the screen comes back into focus (e.g. back from
 * onboarding or My Documents). The first focus is skipped: the queries are just mounting then.
 */
export function useRefetchProfileCompletionOnFocus(uid: string | undefined): void {
  const queryClient = useQueryClient();
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) {
        firstFocus.current = false;
        return;
      }
      if (uid) {
        invalidateProfileCompletion(queryClient, uid);
      }
    }, [queryClient, uid]),
  );
}
