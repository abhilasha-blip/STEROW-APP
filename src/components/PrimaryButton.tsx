import React from 'react';
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
  showArrow?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const PRESS_MS = 90;

export default function PrimaryButton({
  label,
  onPress,
  loading = false,
  showArrow = true,
  accessibilityLabel,
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
          pressed.value = withTiming(1, { duration: PRESS_MS });
        }}
        onPressOut={() => {
          pressed.value = withTiming(0, { duration: PRESS_MS });
        }}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel ?? label}
        accessibilityState={{ busy: loading }}
        style={styles.button}
      >
        {/* Childless gradient layer: wrapping children breaks layout under the New Arch interop. */}
        <LinearGradient
          colors={[colors.primary.main, colors.primary.gradientEnd]}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={StyleSheet.absoluteFill}
        />
        {loading ? (
          <ActivityIndicator color={colors.primary.contrastText} />
        ) : (
          <View style={styles.row}>
            <AppText variant="button" color="primary.contrastText">
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

const makeStyles = ({ sizes, radius }: Theme) =>
  StyleSheet.create({
    button: {
      height: sizes.buttonHeight,
      borderRadius: radius.pill,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    row: { flexDirection: 'row', alignItems: 'center' },
    arrow: { marginLeft: 8 },
  });
