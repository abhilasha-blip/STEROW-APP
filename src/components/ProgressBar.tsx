import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles, type Theme } from '@/theme';

type ProgressBarProps = {
  /** 0–1; clamped. */
  value: number;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** 8pt rounded track with a lime fill (onboarding header). */
export default function ProgressBar({ value, style, testID }: ProgressBarProps) {
  const styles = useThemedStyles(makeStyles);
  const clamped = Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0));
  return (
    <View
      testID={testID}
      style={[styles.track, style]}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamped * 100) }}
    >
      <View style={[styles.fill, { width: `${clamped * 100}%` }]} />
    </View>
  );
}

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    track: {
      height: sizes.progressHeight,
      borderRadius: radius.pill,
      backgroundColor: colors.progress.track,
      overflow: 'hidden',
    },
    fill: {
      height: '100%',
      borderRadius: radius.pill,
      backgroundColor: colors.progress.fill,
    },
  });
