import type { NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

export type AuthStackParamList = {
  SignIn: undefined;
  CreateAccount: undefined;
  VerifyOtp: { phone: string };
  /** Temporary – removed once the real auth screens are built. */
  Placeholder: undefined;
};

export type RootStackParamList = {
  Auth: NavigatorScreenParams<AuthStackParamList>;
  // App: NavigatorScreenParams<AppStackParamList>; // added later
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

export type AuthStackScreenProps<T extends keyof AuthStackParamList> = NativeStackScreenProps<
  AuthStackParamList,
  T
>;

declare global {
  namespace ReactNavigation {
    // Enables typed useNavigation() / Link throughout the app.
    interface RootParamList extends RootStackParamList {}
  }
}
