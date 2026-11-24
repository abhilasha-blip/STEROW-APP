import type React from 'react';
import MyBookingsScreen from '@/screens/app/bookings/MyBookingsScreen';
import MyDocumentsScreen from '@/screens/app/documents/MyDocumentsScreen';
import UploadDocumentsScreen from '@/screens/app/documents/UploadDocumentsScreen';
import MyProfileScreen from '@/screens/app/profile/MyProfileScreen';
import ShareAccessScreen from '@/screens/app/share/ShareAccessScreen';
import MyVehiclesScreen from '@/screens/app/vehicles/MyVehiclesScreen';
import BookingSuccessScreen from '@/screens/bookService/BookingSuccessScreen';
import type { HomeStackParamList, HomeStackScreenProps } from './types';

type Name = Exclude<keyof HomeStackParamList, 'Home' | 'AddVehicle' | 'ComingSoon' | 'BookService'>;
type Screens = { [K in Name]: React.ComponentType<HomeStackScreenProps<K>> };

/** The Home stack's light screens (opened from the dashboard tiles and the drawer). */
export function homeScreens(): Screens {
  return {
    MyProfile: MyProfileScreen,
    MyDocuments: MyDocumentsScreen,
    UploadDocuments: UploadDocumentsScreen,
    ShareAccess: ShareAccessScreen,
    MyVehicles: MyVehiclesScreen,
    BookingSuccess: BookingSuccessScreen,
    MyBookings: MyBookingsScreen,
  };
}
