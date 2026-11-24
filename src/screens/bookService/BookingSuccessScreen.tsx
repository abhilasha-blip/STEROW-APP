import React from 'react';
import { StyleSheet, View } from 'react-native';
import Check from '@/assets/icons/book-service/check.svg';
import AppText from '@/components/AppText';
import LightScreen from '@/components/LightScreen';
import OutlineButton from '@/components/OutlineButton';
import PrimaryButton from '@/components/PrimaryButton';
import { strings } from '@/constants/strings';
import type { HomeStackScreenProps } from '@/navigation/types';
import { useBookingStore } from '@/store/booking.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const t = strings.bookService.success;

/**
 * Congratulations (no Figma): a check in violet halos, the title, one line and EXACTLY two buttons. It sits
 * in the Home stack right above the dashboard (the flow's stack was replaced), so the back gesture and
 * Android back return to the Dashboard, never into the finished flow. No header back arrow.
 */
export default function BookingSuccessScreen({ navigation }: HomeStackScreenProps<'BookingSuccess'>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const goTo = (name: 'MyBookings' | 'BookService') =>
    navigation.reset({ index: 1, routes: [{ name: 'Home' }, { name }] });
  return (
    <LightScreen
      testID="booking-success"
      title={strings.bookService.title}
      aboveTabs
      scroll={false}
      footer={
        <View>
          <PrimaryButton
            testID="booking-success-my-bookings"
            label={t.myBookings}
            labelVariant="buttonStrong"
            showArrow={false}
            onPress={() => goTo('MyBookings')}
          />
          <OutlineButton
            testID="booking-success-book-another"
            label={t.bookAnother}
            onPress={() => {
              useBookingStore.getState().reset();
              goTo('BookService');
            }}
            style={styles.secondary}
          />
        </View>
      }
    >
      <View style={styles.body}>
        <View
          testID="booking-success-illustration"
          style={styles.haloOuter}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t.illustrationA11y}
        >
          <View style={styles.haloInner}>
            <View style={styles.core}>
              <Check width={48} height={48} color={colors.booking.controlMark} />
            </View>
          </View>
        </View>
        <AppText variant="successTitle" color="booking.text" accessibilityRole="header" style={styles.title}>
          {t.title}
        </AppText>
        <AppText variant="bodyLarge" color="booking.subtitle" style={styles.text}>
          {t.body}
        </AppText>
      </View>
    </LightScreen>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: 40 },
    haloOuter: {
      width: 144,
      height: 144,
      borderRadius: 72,
      backgroundColor: colors.booking.successHaloOuter,
      alignItems: 'center',
      justifyContent: 'center',
    },
    haloInner: {
      width: 116,
      height: 116,
      borderRadius: 58,
      backgroundColor: colors.booking.successHaloInner,
      alignItems: 'center',
      justifyContent: 'center',
    },
    core: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.booking.success,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { marginTop: 32, textAlign: 'center' },
    text: { marginTop: 8, textAlign: 'center' },
    secondary: { marginTop: 12 },
  });
