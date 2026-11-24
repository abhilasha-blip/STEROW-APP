import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import LightScreen from '@/components/LightScreen';
import { strings } from '@/constants/strings';
import type { HomeStackScreenProps } from '@/navigation/types';

const t = strings.myBookings;

/**
 * My Bookings: placeholder shell (no Figma, no bookings API in the app yet). Always the empty state: the
 * Book a Service flow is UI-only, so a "booked" mock service must not appear here as a real booking.
 */
export default function MyBookingsScreen({ navigation }: HomeStackScreenProps<'MyBookings'>) {
  return (
    <LightScreen testID="my-bookings" title={t.title} onBack={() => navigation.goBack()} aboveTabs>
      <View testID="my-bookings-empty" style={styles.body}>
        <AppText variant="sectionTitleSmall" color="booking.text">
          {t.emptyTitle}
        </AppText>
        <AppText variant="body" color="booking.subtitle" style={styles.text}>
          {t.emptyBody}
        </AppText>
      </View>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 40, alignItems: 'center' },
  text: { marginTop: 8, textAlign: 'center' },
});
