import React, { memo, type PropsWithChildren } from 'react';
import { Platform, Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles, type Theme } from '@/theme';

type Props = PropsWithChildren<{
  selected: boolean;
  onPress: () => void;
  /** 'radio' (single select) or 'checkbox' (multi select). */
  role: 'radio' | 'checkbox';
  accessibilityLabel: string;
  disabled?: boolean;
  /** step1/2 cards are r12, list rows and chips r8. */
  radius?: 8 | 12;
  testID?: string;
  style?: StyleProp<ViewStyle>;
}>;

/**
 * White card used for every choice in the flow: 1pt black-8% border; selected = 1pt violet border + the
 * Figma drop shadow (y 4, blur 8, black 12%).
 */
function SelectableCard({
  selected,
  onPress,
  role,
  accessibilityLabel,
  disabled = false,
  radius = 12,
  testID,
  style,
  children,
}: Props) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole={role}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: selected, selected, disabled }}
      style={({ pressed }) => [
        styles.card,
        { borderRadius: radius },
        selected && styles.selected,
        disabled && styles.disabled,
        pressed && styles.pressed,
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export default memo(SelectableCard);

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: colors.booking.card, borderWidth: 1, borderColor: colors.booking.cardBorder },
    selected: {
      borderColor: colors.booking.cardSelectedBorder,
      shadowColor: colors.booking.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: Platform.OS === 'android' ? 3 : 0,
    },
    disabled: { opacity: 0.5 },
    pressed: { opacity: 0.85 },
  });
