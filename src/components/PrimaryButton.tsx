import React, { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import ArrowRight from '@/assets/icons/arrow-right.svg';
import { haptics } from '@/services/haptics';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import AppText from './AppText';

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  /** While loading the button shows a spinner and ignores presses (no faded state). */
  loading?: boolean;
  /**
   * The step's required input is missing (design/onboarding steps 2–4): a solid grey fill with a
   * white label and no gradient; presses are ignored.
   */
  disabled?: boolean;
  showArrow?: boolean;
  /** 'button' (Medium 18, auth screens) or 'buttonStrong' (SemiBold 18, onboarding). */
  labelVariant?: 'button' | 'buttonStrong';
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const PRESS_MS = 90;

function PrimaryButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  showArrow = true,
  labelVariant = 'button',
  accessibilityLabel,
  testID,
  style,
}: PrimaryButtonProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: 1 - pressed.value * 0.02 }],
    opacity: 1 - pressed.value * 0.1,
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Pressable
        onPress={() => {
          haptics.light();
          onPress();
        }}
        onPressIn={() => {
          if (disabled) {
            return;
          }
          pressed.value = withTiming(1, { duration: PRESS_MS });
        }}
        onPressOut={() => {
          pressed.value = withTiming(0, { duration: PRESS_MS });
        }}
        testID={testID}
        disabled={loading || disabled}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ busy: loading, disabled }}
        style={[styles.button, disabled && styles.disabled]}
      >
        {/* Childless gradient layer: wrapping children breaks layout under the New Arch interop. */}
        {!disabled && (
          <LinearGradient
            colors={[colors.primary.main, colors.primary.gradientEnd]}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={StyleSheet.absoluteFill}
          />
        )}
        {loading ? (
          <ActivityIndicator color={colors.primary.contrastText} />
        ) : (
          <View style={styles.row}>
            <AppText variant={labelVariant} color="primary.contrastText">
              {label}
            </AppText>
            {showArrow && (
              <ArrowRight
                width={sizes.arrowIconWidth}
                height={sizes.arrowIconHeight}
                color={colors.primary.contrastText}
                style={styles.arrow}
              />
            )}
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    button: {
      height: sizes.buttonHeight,
      borderRadius: radius.pill,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    disabled: { backgroundColor: colors.primary.disabled },
    row: { flexDirection: 'row', alignItems: 'center' },
    arrow: { marginLeft: 8 },
  });

export default memo(PrimaryButton);
