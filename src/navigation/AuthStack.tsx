import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import CreateAccountScreen from '@/screens/auth/CreateAccountScreen';
import SignInScreen from '@/screens/auth/SignInScreen';
import VerifyOtpScreen from '@/screens/auth/VerifyOtpScreen';
import { useTheme } from '@/theme';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  const { colors } = useTheme();
  return (
    <Stack.Navigator
      initialRouteName="SignIn"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        contentStyle: { backgroundColor: colors.background.gradientMid },
      }}
    >
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="CreateAccount" component={CreateAccountScreen} />
      <Stack.Screen name="VerifyOtp" component={VerifyOtpScreen} />
    </Stack.Navigator>
  );
}
