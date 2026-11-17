import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import { useScale } from '@/utils/scale';
import AppText from './AppText';

type BiometricButtonProps = {
  icon: React.FC<SvgProps>;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 64pt card: icon 25pt from the left edge, 16pt gap, label (left-aligned as in Figma).
 * On screens narrower than the 402pt design frame the inner spacing, icon and label shrink
 * proportionally so "Finger Print" still fits on one line (e.g. 360dp Android phones).
 */
export default function BiometricButton({
  icon: Icon,
  label,
  onPress,
  disabled,
  accessibilityLabel,
  style,
}: BiometricButtonProps) {
  const { colors, sizes, typography } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { s } = useScale();
  const fit = (v: number) => Math.min(v, s(v)); // shrink only, never grow
  const label16 = typography.variants.biometric;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [
        styles.card,
        { paddingLeft: fit(25), paddingRight: fit(8) },
        pressed && styles.pressed,
        style,
      ]}
    >
      <Icon
        width={fit(sizes.biometricIcon)}
        height={fit(sizes.biometricIcon)}
        color={colors.accent.biometric}
      />
      <AppText
        variant="biometric"
        color="text.secondary"
        style={[
          styles.label,
          {
            marginLeft: fit(16),
            fontSize: fit(label16.fontSize ?? 16),
            lineHeight: fit(label16.lineHeight ?? 20),
          },
        ]}
        numberOfLines={1}
      >
        {label}
      </AppText>
    </Pressable>
  );
}

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    card: {
      flex: 1,
      height: sizes.biometricHeight,
      borderRadius: radius.card,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.surface.cardBorder,
      flexDirection: 'row',
      alignItems: 'center',
    },
    pressed: { opacity: 0.8 },
    label: { flexShrink: 1 },
  });
