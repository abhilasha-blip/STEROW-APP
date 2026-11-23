import React, { useEffect, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainNavigator from './MainNavigator';
import OnboardingStack from './OnboardingStack';
import { useAuthStore } from '@/store/auth.store';
import { useOnboardingStore } from '@/store/onboarding.store';
import { useTheme } from '@/theme';
import type { AppStackParamList } from './types';

const Stack = createNativeStackNavigator<AppStackParamList>();

/**
 * Signed-in app. Opens where the auth store's bootstrap decided (onboarding 1/3, 2/3, 3/3 or the
 * Dashboard), with nothing underneath: Back can't return to sign-in, and onboarding leaves with a
 * reset to the Dashboard.
 */
export default function AppStack() {
  const { colors } = useTheme();
  // Read once: the stack's initial route must not change while it is mounted.
  const [startRoute] = useState(() => useAuthStore.getState().startRoute);
  // Signed out (this stack unmounts): in-memory onboarding values must not outlive the session.
  useEffect(() => () => useOnboardingStore.getState().reset(), []);
  const onboarding = startRoute !== 'Dashboard';
  return (
    <Stack.Navigator
      initialRouteName={onboarding ? 'Onboarding' : 'Dashboard'}
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.background.gradientMid },
      }}
    >
      <Stack.Screen name="Dashboard" component={MainNavigator} />
      <Stack.Screen
        name="Onboarding"
        component={OnboardingStack}
        options={{ animation: 'slide_from_right' }}
        initialParams={onboarding ? { screen: startRoute } : undefined}
      />
    </Stack.Navigator>
  );
}
