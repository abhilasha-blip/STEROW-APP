import React, { useEffect } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { BookServiceStackParamList, HomeStackScreenProps } from '@/navigation/types';
import { useBookingStore } from '@/store/booking.store';
import { useTheme } from '@/theme';
import ChooseVehicleScreen from './ChooseVehicleScreen';

const Stack = createNativeStackNavigator<BookServiceStackParamList>();

/**
 * BookServiceStack: the four steps, inside the Home tab (bottom tabs stay visible). Opened from the
 * dashboard's "Book Service" tile and the drawer's "My Services". The booking store is cleared when the
 * flow is left (this stack unmounts), so the next booking starts at an empty Step 1.
 */
export default function BookServiceNavigator(_: HomeStackScreenProps<'BookService'>) {
  const { colors } = useTheme();
  useEffect(() => () => useBookingStore.getState().reset(), []);
  return (
    <Stack.Navigator
      initialRouteName="BookVehicle"
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.booking.background },
      }}
    >
      <Stack.Screen name="BookVehicle" component={ChooseVehicleScreen} />
    </Stack.Navigator>
  );
}
