import type React from 'react';
import MyDocumentsScreen from '@/screens/app/documents/MyDocumentsScreen';
import UploadDocumentsScreen from '@/screens/app/documents/UploadDocumentsScreen';
import MyProfileScreen from '@/screens/app/profile/MyProfileScreen';
import ShareAccessScreen from '@/screens/app/share/ShareAccessScreen';
import MyVehiclesScreen from '@/screens/app/vehicles/MyVehiclesScreen';
import type { HomeStackParamList, HomeStackScreenProps } from './types';

type Name = Exclude<keyof HomeStackParamList, 'Home' | 'AddVehicle' | 'ComingSoon'>;
type Screens = { [K in Name]: React.ComponentType<HomeStackScreenProps<K>> };

/** The Home stack's light screens (opened from the dashboard tiles and the drawer). */
export function homeScreens(): Screens {
  return {
    MyProfile: MyProfileScreen,
    MyDocuments: MyDocumentsScreen,
    UploadDocuments: UploadDocumentsScreen,
    ShareAccess: ShareAccessScreen,
    MyVehicles: MyVehiclesScreen,
  };
}
