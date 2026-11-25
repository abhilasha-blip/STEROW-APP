/**
 * DEV ONLY: a gallery of the text inputs with descender-heavy text (g y p q j), for the clipped-text
 * check on the simulator (no typing is possible there). Launch with:
 *
 *   xcrun simctl launch booted com.sterow.app -qaScenario fields
 *
 * The same components and props as Sign Up (dark, input / inputLarge + prefix), the onboarding forms
 * (light, inputSmall) and the OTP boxes. App.tsx only requires this file under __DEV__.
 */
import React from 'react';
import { Platform, Settings, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BufferedTextField from '@/components/BufferedTextField';
import CountryPrefix from '@/components/CountryPrefix';
import OtpInput from '@/components/OtpInput';
import ScreenContainer from '@/components/ScreenContainer';
import TextField from '@/components/TextField';
import { useThemedStyles, type Theme } from '@/theme';

const noop = () => {};

export function isQaFieldsScenario(): boolean {
  return __DEV__ && Platform.OS === 'ios' && Settings.get('qaScenario') === 'fields';
}

export default function QaFields() {
  const styles = useThemedStyles(makeStyles);
  return (
    <ScreenContainer car designTop={64}>
      <BufferedTextField testID="qa-name" label="Full Name" initialValue="Gary Pyle Jaqueline" autoCapitalize="words" autoFocus />
      <BufferedTextField
        testID="qa-phone"
        style={styles.gap}
        label="Mobile Number"
        prefix={<CountryPrefix country="IN" onPress={noop} />}
        inputVariant="inputLarge"
        paddingStart={16}
        initialValue="9876543210"
      />
      <BufferedTextField testID="qa-referral" style={styles.gap} label="Referral Code" initialValue="GYPQJ2024" />
      <OtpInput style={styles.gap} value="1234" onChange={noop} autoFocus={false} />
      <View style={[styles.gap, styles.light]}>
        <AppText variant="fieldLabel" color="text.onLight">
          Onboarding (light)
        </AppText>
        <TextField variant="light" style={styles.gapSmall} label="Full name" defaultValue="Gary Pyle Jaqueline" />
        <TextField variant="light" style={styles.gapSmall} label="Email" defaultValue="jaggy.pq@yahoo.org" />
      </View>
    </ScreenContainer>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    gap: { marginTop: 20 },
    gapSmall: { marginTop: 12 },
    light: { backgroundColor: colors.surface.sheetLight, padding: 16, borderRadius: 16 },
  });
