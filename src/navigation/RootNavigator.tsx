import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';
import AppStack from './AppStack';
import AuthStack from './AuthStack';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * The auth store decides what is mounted; screens never navigate after login/logout.
 * While the session is restored ('loading') nothing renders and the splash stays up.
 */
export default function RootNavigator() {
  const { colors } = useTheme();
  const status = useAuthStore(s => s.status);

  if (status === 'loading') {
    return null;
  }
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'fade',
        contentStyle: { backgroundColor: colors.background.gradientMid },
      }}
    >
      {status === 'signedIn' ? (
        <Stack.Screen name="App" component={AppStack} />
      ) : (
        <Stack.Screen name="Auth" component={AuthStack} />
      )}
    </Stack.Navigator>
  );
}
