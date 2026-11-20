import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import { COUNTRIES, type CountryCode } from '@/constants/countries';
import { strings } from '@/constants/strings';
import { useThemedStyles, type Theme } from '@/theme';

type Props = {
  country: CountryCode;
  onPress: () => void;
  disabled?: boolean;
};

const t = strings.mobileEntry;

/** "🇮🇳 +91 ▾" inside the mobile field, followed by a thin divider. Opens the country sheet. */
export default function CountryPrefix({ country, onPress, disabled }: Props) {
  const styles = useThemedStyles(makeStyles);
  const c = COUNTRIES[country];
  return (
    <View style={styles.row}>
      <Pressable
        testID="country-prefix"
        onPress={onPress}
        disabled={disabled}
        hitSlop={{ top: 12, bottom: 12, left: 12, right: 4 }}
        accessibilityRole="button"
        accessibilityLabel={t.countryPickerA11y(t.countryNames[country], c.dialCode)}
        accessibilityState={{ disabled: !!disabled }}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <AppText variant="inputLarge" importantForAccessibility="no">
          {`${c.flag} +${c.dialCode}`}
        </AppText>
        <AppText variant="caption" color="text.secondary" style={styles.chevron} importantForAccessibility="no">
          {t.countryChevron}
        </AppText>
      </Pressable>
      <View style={styles.divider} />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    button: { flexDirection: 'row', alignItems: 'center', height: '100%' },
    pressed: { opacity: 0.6 },
    chevron: { marginLeft: 4 },
    divider: {
      width: StyleSheet.hairlineWidth * 2,
      height: '45%',
      marginHorizontal: 10,
      backgroundColor: colors.surface.divider,
    },
  });
