import { OTP_LENGTH } from './auth';

/** All user-facing copy. */
export const strings = {
  mobileEntry: {
    signin: {
      title: 'Sign In',
      subtitle: 'Enter your mobile number to continue',
      footerPrompt: "Don't have an account?",
      footerLink: 'Sign up',
      otpSent: 'OTP sent to your mobile',
    },
    signup: {
      title: 'Create Account',
      subtitle: 'Enter your details to get started',
      footerPrompt: 'Already have an account?',
      footerLink: 'Sign in',
      otpSent: 'OTP sent to your mobile number',
    },
    fullNameLabel: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    mobileLabel: 'Mobile Number',
    countryCode: '+91',
    mobilePlaceholder: 'mobile number',
    referralLabel: 'Referral Code (optional)',
    referralPlaceholder: 'e.g. STRAB12CD',
    submit: 'Send OTP',
    invalidFullName: 'Enter your full name',
    invalidMobile: 'Enter a valid 10-digit mobile number',
    invalidReferral: 'Referral code can only contain letters and numbers',
  },
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
      `Enter your ${OTP_LENGTH}-digit code sent to your mobile number ending ${maskedPhone}`,
    codeLabel: 'Code',
    resendIn: 'Resend code in',
    resend: 'Resend code',
    submit: 'Confirm',
    incompleteCode: `Enter the ${OTP_LENGTH}-digit code`,
    resent: 'A new code has been sent',
    invalidCode: 'Invalid code. Please try again.',
    otpBoxLabel: (index: number, digit?: string) =>
      `Digit ${index + 1}${digit ? `, ${digit}` : ', empty'}`,
  },
  common: {
    back: 'Go back',
    genericError: 'Something went wrong. Please try again.',
    ok: 'OK',
  },
  /** Removed with HomeScreen in step 4.5. */
  home: {
    title: 'Home (placeholder)',
  },
  dashboard: {
    welcome: (name: string) => `Welcome, ${name}`,
    fallbackName: 'there',
    phoneLabel: 'Mobile',
    rolesLabel: 'Role',
    noRole: 'No role assigned',
    logout: 'Log out',
  },
  network: {
    offline: "You're offline. Check your internet connection.",
    backOnline: 'Back online',
  },
  toast: {
    dismissHint: 'Swipe up to dismiss',
  },
  errors: {
    alreadyRegistered: 'This mobile number is already registered. Please sign in.',
    noAccount: 'No account found for this mobile number. Please sign up.',
    cooldown: 'Please wait 30 seconds before requesting another OTP.',
    incorrectOtp: 'Incorrect OTP.',
    otpExpired: 'This code has expired. Please request a new one.',
    invalidPhone: 'Enter a valid 10-digit mobile number',
    network: 'No internet connection. Please try again.',
    timeout: 'The request timed out. Please try again.',
    sessionExpired: 'Your session has expired. Please sign in again.',
    generic: 'Something went wrong. Please try again.',
  },
} as const;
