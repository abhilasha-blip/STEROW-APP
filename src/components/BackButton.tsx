import React from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import ArrowLeft from '@/assets/icons/arrow-left.svg';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';

type BackButtonProps = {
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export default function BackButton({ onPress, style }: BackButtonProps) {
  const navigation = useNavigation();
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      onPress={onPress ?? (() => navigation.goBack())}
      hitSlop={8}
      accessibilityRole="button"
      accessibilityLabel={strings.common.back}
      style={({ pressed }) => [styles.button, pressed && styles.pressed, style]}
    >
      <ArrowLeft width={sizes.backIcon} height={sizes.backIcon} color={colors.text.primary} />
    </Pressable>
  );
}

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    button: {
      width: sizes.backButton,
      height: sizes.backButton,
      borderRadius: radius.pill,
      backgroundColor: colors.surface.iconButton,
      borderWidth: 1,
      borderColor: colors.surface.iconButtonBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.8 },
  });
