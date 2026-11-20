import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import OnboardingProfileScreen from '@/screens/onboarding/OnboardingProfileScreen';
import type { ProfileFormValues } from '@/screens/onboarding/profile.schema';
import { useTheme } from '@/theme';
import { logger } from '@/utils/logger';
import type { OnboardingStackParamList, OnboardingStackScreenProps } from './types';

const Stack = createNativeStackNavigator<OnboardingStackParamList>();

/** Which fields were provided – never the values themselves (PII). */
const summarize = (v: ProfileFormValues) => ({
  avatar: v.avatar?.type ?? 'none',
  dlNumber: !!v.dlNumber,
  dlImage: !!v.dlImageUri,
  fullName: !!v.fullName,
  dob: !!v.dob,
  email: !!v.email,
});

/** UI-only for now: Next / Skip just log (dev builds). Tomorrow: save + go to step 2. */
function Step1ProfileRoute({ navigation, route }: OnboardingStackScreenProps<'Step1Profile'>) {
  return (
    <OnboardingProfileScreen
      initialValues={route.params?.initialValues}
      onBack={() => navigation.goBack()}
      onNext={values => logger.info('onboarding step 1: next', summarize(values))}
      onSkip={() => logger.info('onboarding step 1: skip')}
    />
  );
}

export default function OnboardingStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="Step1Profile"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background.gradientMid },
      }}
    >
      <Stack.Screen name="Step1Profile" component={Step1ProfileRoute} />
    </Stack.Navigator>
  );
}
