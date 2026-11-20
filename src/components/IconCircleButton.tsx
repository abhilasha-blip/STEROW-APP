import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import CloseIcon from '@/assets/icons/close.svg';
import { useThemedStyles, useTheme, type Theme } from '@/theme';

type IconCircleButtonProps = {
  onPress: () => void;
  accessibilityLabel: string;
  icon?: React.FC<SvgProps>;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** 32pt round light button with a 24pt glyph (default: X) – sheet close and "remove upload". */
export default function IconCircleButton({
  onPress,
  accessibilityLabel,
  icon: Icon = CloseIcon,
  testID,
  style,
}: IconCircleButtonProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      hitSlop={6}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <Icon width={24} height={24} color={colors.input.lightIcon} />
    </Pressable>
  );
}

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    button: {
      width: sizes.iconButtonSmall,
      height: sizes.iconButtonSmall,
      borderRadius: radius.pill,
      backgroundColor: colors.surface.iconButtonLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.7 },
  });
