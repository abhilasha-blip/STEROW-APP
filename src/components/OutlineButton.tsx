import React, { memo } from 'react';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { useThemedStyles, type Theme } from '@/theme';
import AppText from './AppText';

type OutlineButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Secondary action on the light onboarding sheet: transparent, 1pt violet border and label, pill shape,
 * the primary button's height. No Figma frame yet (step 2 entry: "Add your vehicle details manually").
 */
function OutlineButton({ label, onPress, disabled = false, accessibilityLabel, testID, style }: OutlineButtonProps) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      style={({ pressed }) => [styles.button, (pressed || disabled) && styles.dimmed, style]}
    >
      <AppText variant="smallStrong" color="primary.main" numberOfLines={1}>
        {label}
      </AppText>
    </Pressable>
  );
}

export default memo(OutlineButton);

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    button: {
      height: sizes.buttonHeight,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.primary.main,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
    },
    dimmed: { opacity: 0.6 },
  });
