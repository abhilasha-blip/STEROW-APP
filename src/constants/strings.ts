/** All user-facing copy for the auth flow. */
export const strings = {
  signIn: {
    title: 'Sign In',
    subtitle: 'Enter your STEROW PIN to access your console',
    pinLabel: 'PIN',
    pinPlaceholder: 'Enter your STEROW app PIN',
    submit: 'Log In',
    orLoginWith: 'Or Log in with',
    faceId: 'Face ID',
    fingerprint: 'Finger Print',
    noAccount: "Don't have an account?",
    // Figma says "Sing up" – typo, intentionally corrected.
    signUp: 'Sign up',
    invalidPin: 'Enter your 4–6 digit PIN',
    incorrectPin: 'Incorrect PIN. Please try again.',
    biometricPrompt: 'Log in to STEROW',
    biometricUnavailableTitle: 'Biometrics unavailable',
    biometricUnavailable: "Biometric login isn't set up on this device",
    biometricFailed: "We couldn't verify you. Please try again or use your PIN.",
  },
  createAccount: {
    title: 'Create Account',
    subtitle: 'Enter your mobile number',
    mobileLabel: 'Mobile Number',
    countryCode: '+91',
    mobilePlaceholder: 'mobile number',
    // Figma shows "Log In" here; product decision is "Continue".
    submit: 'Continue',
    invalidMobile: 'Enter a valid 10-digit mobile number',
  },
  verifyOtp: {
    title: 'Verify OTP',
    description: (maskedPhone: string) =>
      `Enter your 4-digit code sent to your mobile number ending ${maskedPhone}`,
    codeLabel: 'Code',
    resendIn: 'Resend code in',
    resend: 'Resend code',
    submit: 'Confirm',
    incompleteCode: 'Enter the 4-digit code',
    invalidCode: 'Invalid code. Please try again.',
    otpBoxLabel: (index: number, digit?: string) =>
      `Digit ${index + 1}${digit ? `, ${digit}` : ', empty'}`,
  },
  common: {
    back: 'Go back',
    genericError: 'Something went wrong. Please try again.',
    ok: 'OK',
  },
  home: {
    title: 'Home (placeholder)',
  },
} as const;
