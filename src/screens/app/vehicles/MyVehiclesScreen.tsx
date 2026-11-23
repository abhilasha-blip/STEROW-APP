import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { strings } from '@/constants/strings';
import { useMyVehicles } from '@/hooks/api/useDocumentsStep';
import type { HomeStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';
import VehicleCard from '../../dashboard/components/VehicleCard';
import { vehicleName } from '../../dashboard/components/VehicleCarousel';

const t = strings.myVehicles;

/**
 * My Vehicles: NO Figma yet. Placeholder: the user's vehicles as the carousel's cards + "Add vehicle".
 * Tapping a card opens its documents.
 */
export default function MyVehiclesScreen({ navigation }: HomeStackScreenProps<'MyVehicles'>) {
  const uid = useAuthStore(s => s.user?.id);
  const vehicles = useMyVehicles(uid);
  const { colors } = useTheme();
  return (
    <LightScreen
      testID="my-vehicles"
      title={t.title}
      onBack={() => navigation.goBack()}
      aboveTabs
      footer={
        <PrimaryButton
          testID="my-vehicles-add"
          label={t.add}
          labelVariant="buttonStrong"
          showArrow={false}
          onPress={() => navigation.navigate('AddVehicle')}
        />
      }
    >
      {vehicles.isLoading ? (
        <ActivityIndicator color={colors.input.lightSpinner} />
      ) : vehicles.data?.length ? (
        <View style={styles.list}>
          {vehicles.data.map(v => (
            <VehicleCard
              key={v.id}
              testID={`my-vehicle-${v.id}`}
              title={vehicleName(v)}
              subtitle={v.vehicleNumber}
              onPress={() => navigation.navigate('MyDocuments', { vehicleId: v.id })}
            />
          ))}
        </View>
      ) : (
        <AppText testID="my-vehicles-empty" variant="body" color="text.onLightMuted">
          {t.empty}
        </AppText>
      )}
    </LightScreen>
  );
}

const styles = StyleSheet.create({ list: { gap: 12 } });
