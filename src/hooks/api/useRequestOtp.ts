import { requestOtp, type RequestOtpInput } from '@/api/services/auth.service';
import type { OtpRequestResponse } from '@/api/schemas/auth.schemas';
import { useAbortableMutation } from './useAbortableMutation';

/** Send (or resend) an OTP. Retry: never. Aborted on unmount. */
export function useRequestOtp() {
  return useAbortableMutation<RequestOtpInput, OtpRequestResponse>((input, signal) =>
    requestOtp(input, { signal }),
  );
}
