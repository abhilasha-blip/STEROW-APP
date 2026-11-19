import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MobileEntryScreen from '@/screens/auth/MobileEntryScreen';
import VerifyOtpScreen from '@/screens/auth/VerifyOtpScreen';
import { useTheme } from '@/theme';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="MobileEntry"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background.gradientMid },
      }}
    >
      <Stack.Screen name="MobileEntry" component={MobileEntryScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </Stack.Navigator>
  );
}
