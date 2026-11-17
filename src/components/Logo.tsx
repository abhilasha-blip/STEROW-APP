import React from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LogoFull from '@/assets/icons/logo-full.svg';
import { useTheme } from '@/theme';
import { useScale } from '@/utils/scale';

type LogoProps = { style?: StyleProp<ViewStyle> };

/** STEROW logo exactly as exported from Figma (200 x 60 frame, centred). */
export default function Logo({ style }: LogoProps) {
  const { colors, sizes } = useTheme();
  const { s } = useScale();
  return (
    <View
      style={[styles.root, style]}
      accessible
      accessibilityRole="image"
      accessibilityLabel="STEROW"
    >
      <LogoFull
        width={s(sizes.logoWidth)}
        height={s(sizes.logoHeight)}
        color={colors.text.primary}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: 'center' },
});
