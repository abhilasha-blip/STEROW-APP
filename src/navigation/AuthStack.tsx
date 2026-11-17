import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import PlaceholderScreen from '@/screens/PlaceholderScreen';
import type { AuthStackParamList } from './types';

const Stack = createNativeStackNavigator<AuthStackParamList>();

export default function AuthStack() {
  return (
    <Stack.Navigator
      initialRouteName="Placeholder"
      screenOptions={{ headerShown: false, animation: 'slide_from_right' }}
    >
      <Stack.Screen name="Placeholder" component={PlaceholderScreen} />
    </Stack.Navigator>
  );
}
