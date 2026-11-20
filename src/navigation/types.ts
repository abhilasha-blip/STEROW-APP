import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { CountryCode } from '@/constants/countries';
import type { OnboardingProfileInitialValues } from '@/screens/onboarding/useOnboardingProfileForm';

export type AuthMode = 'signin' | 'signup';

export type AuthStackParamList = {
  MobileEntry: { mode?: AuthMode; country?: CountryCode; phone?: string } | undefined;
  VerifyOtp: {
    mode: AuthMode;
    country: CountryCode;
    /** National number as typed (no dial code). */
    phone: string;
    requestId: string;
    fullName?: string;
    referralCode?: string;
  };
};

export type OnboardingStackParamList = {
  /** Step 1 "My Profile". Tomorrow: initial values from user_details / OCR. */
  Step1Profile: { initialValues?: OnboardingProfileInitialValues } | undefined;
};

export type AppStackParamList = {
  Dashboard: undefined;
  Onboarding: NavigatorScreenParams<OnboardingStackParamList> | undefined;
};

/** Exactly one of these is mounted, chosen by the auth store's status. */
export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  App: NavigatorScreenParams<AppStackParamList>;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AuthStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type AppStackScreenProps<T extends keyof AppStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<AppStackParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type OnboardingStackScreenProps<T extends keyof OnboardingStackParamList> = CompositeScreenProps<
  NativeStackScreenProps<OnboardingStackParamList, T>,
  AppStackScreenProps<keyof AppStackParamList>
>;

declare global {
  namespace ReactNavigation {
    // Enables typed useNavigation() / Link throughout the app.
    interface RootParamList extends RootStackParamList {}
  }
}
