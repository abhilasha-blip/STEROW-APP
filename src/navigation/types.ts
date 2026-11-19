import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthMode = 'signin' | 'signup';

export type AuthStackParamList = {
  MobileEntry: { mode?: AuthMode; phone?: string } | undefined;
  VerifyOtp: {
    mode: AuthMode;
    phone: string;
    requestId: string;
    fullName?: string;
    referralCode?: string;
  };
};

export type AppStackParamList = {
  Dashboard: undefined;
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

declare global {
  namespace ReactNavigation {
    // Enables typed useNavigation() / Link throughout the app.
    interface RootParamList extends RootStackParamList {}
  }
}
