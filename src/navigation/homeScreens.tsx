import React from 'react';
import { strings } from '@/constants/strings';
import ComingSoonScreen from '@/screens/common/ComingSoonScreen';
import type { HomeStackParamList, HomeStackScreenProps } from './types';

type Name = Exclude<keyof HomeStackParamList, 'Home' | 'AddVehicle' | 'ComingSoon'>;
type Screens = { [K in Name]: React.ComponentType<HomeStackScreenProps<K>> };

const placeholder = (title: string) =>
  function Placeholder({ navigation }: { navigation: { goBack: () => void } }) {
    return <ComingSoonScreen title={title} onBack={() => navigation.goBack()} />;
  };

/** The Home stack's light screens (Part 4 replaces the placeholders). */
export function homeScreens(): Screens {
  return {
    MyProfile: placeholder(strings.myProfile.title),
    MyDocuments: placeholder(strings.myDocuments.title),
    UploadDocuments: placeholder(strings.myDocuments.uploadTitle),
    ShareAccess: placeholder(strings.shareAccess.title),
    MyVehicles: placeholder(strings.myVehicles.title),
  };
}
