import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { strings } from '@/constants/strings';
import { useThemedStyles, type Theme } from '@/theme';
import AppText from './AppText';

type OrDividerProps = { label?: string; style?: StyleProp<ViewStyle> };

/** Two 1pt lines with a centred muted "Or" (Figma: lines end 16pt / start 18pt around the word). */
export default function OrDivider({ label = strings.onboarding.profile.or, style }: OrDividerProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={[styles.row, style]}>
      <View style={styles.line} />
      <AppText variant="fieldLabel" color="text.onLightMuted" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.line} />
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center' },
    line: { flex: 1, height: 1, backgroundColor: colors.surface.dividerLight },
    label: { marginHorizontal: 11 },
  });
