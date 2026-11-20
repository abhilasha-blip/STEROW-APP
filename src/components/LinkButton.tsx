import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles, type ColorToken, type Theme, type TypographyVariant } from '@/theme';
import AppText from './AppText';

type LinkButtonProps = {
  label: string;
  onPress: () => void;
  variant?: TypographyVariant;
  color?: ColorToken;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Text-only violet button: "Skip for now", "Cancel". Keeps a 44pt touch target. */
export default function LinkButton({
  label,
  onPress,
  variant = 'link',
  color = 'text.link',
  disabled,
  accessibilityLabel,
  testID,
  style,
}: LinkButtonProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed, style]}
    >
      <AppText variant={variant} color={color}>
        {label}
      </AppText>
    </Pressable>
  );
}

const makeStyles = ({ sizes }: Theme) =>
  StyleSheet.create({
    button: {
      alignSelf: 'center',
      minHeight: sizes.minTouchTarget,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 8,
    },
    dimmed: { opacity: 0.6 },
  });
