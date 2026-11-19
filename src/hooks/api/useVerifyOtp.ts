import type { Session } from '@supabase/supabase-js';
import { verifyOtp, type VerifyOtpInput } from '@/api/services/auth.service';
import { useAbortableMutation } from './useAbortableMutation';

/**
 * Verify the code. On success supabase-js stores the session and emits SIGNED_IN; the auth store
 * then bootstraps the user and RootNavigator switches stacks. No manual navigation.
 */
export function useVerifyOtp() {
  return useAbortableMutation<VerifyOtpInput, Session>((input, signal) => verifyOtp(input, { signal }));
}
