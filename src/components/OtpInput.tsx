import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, TextInput, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import { digitsOnly } from '@/utils/validation';
import AppText from './AppText';

export type OtpInputHandle = {
  shake: () => void;
  focus: () => void;
};

type OtpInputProps = {
  value: string;
  onChange: (value: string) => void;
  length?: number;
  error?: boolean;
  autoFocus?: boolean;
  style?: StyleProp<ViewStyle>;
};

const SHAKE_OFFSET = 10;
const SHAKE_STEP_MS = 50; // 6 steps = 300ms

/**
 * One hidden TextInput drives N presentational boxes. This gives native backspace, paste and
 * iOS/Android SMS autofill (textContentType="oneTimeCode" / autoComplete="sms-otp").
 * The input covers the boxes, so tapping any box focuses it.
 */
const OtpInput = forwardRef<OtpInputHandle, OtpInputProps>(function OtpInputInner(
  { value, onChange, length = 4, error = false, autoFocus = true, style },
  ref,
) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [focused, setFocused] = useState(false);

  const shakeX = useSharedValue(0);
  const caretOpacity = useSharedValue(1);

  useImperativeHandle(ref, () => ({
    shake: () => {
      shakeX.value = withSequence(
        withTiming(-SHAKE_OFFSET, { duration: SHAKE_STEP_MS }),
        withTiming(SHAKE_OFFSET, { duration: SHAKE_STEP_MS }),
        withTiming(-SHAKE_OFFSET, { duration: SHAKE_STEP_MS }),
        withTiming(SHAKE_OFFSET, { duration: SHAKE_STEP_MS }),
        withTiming(-SHAKE_OFFSET / 2, { duration: SHAKE_STEP_MS }),
        withTiming(0, { duration: SHAKE_STEP_MS }),
      );
    },
    focus: () => inputRef.current?.focus(),
  }));

  // 1s blink: visible 500ms, hidden 500ms.
  useEffect(() => {
    caretOpacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 0 }),
        withTiming(1, { duration: 500 }),
        withTiming(0, { duration: 0 }),
        withTiming(0, { duration: 500 }),
      ),
      -1,
    );
    return () => cancelAnimation(caretOpacity);
  }, [caretOpacity]);

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));
  const caretStyle = useAnimatedStyle(() => ({ opacity: caretOpacity.value }));

  const activeIndex = Math.min(value.length, length - 1);
  const showCaret = focused && value.length < length;

  return (
    <View style={style}>
      <Animated.View style={[styles.row, rowStyle]}>
        {Array.from({ length }, (_, i) => {
          const digit = value[i];
          return (
            <View
              key={i}
              style={[styles.box, error && styles.boxError]}
              accessibilityLabel={strings.verifyOtp.otpBoxLabel(i, digit)}
            >
              {digit ? (
                <AppText variant="otpDigit">{digit}</AppText>
              ) : (
                showCaret &&
                i === activeIndex && <Animated.View style={[styles.caret, caretStyle]} />
              )}
            </View>
          );
        })}
      </Animated.View>
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={t => onChange(digitsOnly(t).slice(0, length))}
        maxLength={length}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        accessibilityLabel={`${strings.verifyOtp.codeLabel}, ${length} digits`}
        style={[StyleSheet.absoluteFill, styles.hiddenInput, { color: colors.text.primary }]}
      />
    </View>
  );
});

export default OtpInput;

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    row: { flexDirection: 'row', gap: sizes.otpGap },
    // The active box keeps the normal border in Figma; focus is shown by the blinking caret.
    box: {
      flex: 1,
      height: sizes.otpBoxHeight,
      borderRadius: radius.otpBox,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.surface.cardBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    boxError: { borderColor: colors.status.error },
    caret: {
      position: 'absolute',
      left: 18,
      width: 2,
      height: 18,
      borderRadius: 1,
      backgroundColor: colors.input.caret,
    },
    hiddenInput: { opacity: 0.011, fontSize: 1 },
  });
