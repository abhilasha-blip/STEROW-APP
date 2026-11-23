import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '@/screens/app/DashboardScreen';
import OnboardingStack from './OnboardingStack';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useTheme } from '@/theme';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

export default function AppStack() {
  const { colors } = useTheme();
  // Signed out (this stack unmounts): onboarding data kept by a step 2 skip must not outlive the session.
  useEffect(() => () => useOnboardingStore.getState().reset(), []);
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.gradientMid },
      }}
    >
      <Stack.Screen name="Dashboard" component={DashboardScreen} />
      <Stack.Screen name="Onboarding" component={OnboardingStack} options={{ animation: 'slide_from_right' }} />
    </Stack.Navigator>
  );
}
