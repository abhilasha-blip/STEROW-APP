import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PropsWithChildren,
} from 'react';
import { AccessibilityInfo, PanResponder, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import ToastIcon from './ToastIcon';

export type ToastType = 'success' | 'error';
export type ToastOptions = { type?: ToastType; message: string };

type ToastApi = {
  show: (options: ToastOptions) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  hide: () => void;
};

export const TOAST_DURATION_MS = 3000;
const ANIM_MS = 220;
const HIDDEN_Y = -160;
const SWIPE_DISMISS_DY = -24;
const ICON_SIZE = 22;

const ToastContext = createContext<ToastApi | null>(null);

type Current = { id: number; type: ToastType; message: string };

/**
 * One toast at a time (a new one replaces the current one). Top of the screen below the safe area,
 * auto-hides after 3 s, swipe up to dismiss, announced to screen readers.
 */
export function ToastProvider({ children }: PropsWithChildren) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState<Current | null>(null);
  const idRef = useRef(0);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const translateY = useSharedValue(HIDDEN_Y);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };

  const hide = useCallback(() => {
    clearTimer();
    translateY.value = withTiming(HIDDEN_Y, { duration: ANIM_MS });
    const id = idRef.current;
    setTimeout(() => setCurrent(c => (c?.id === id ? null : c)), ANIM_MS);
  }, [translateY]);

  const show = useCallback(
    ({ type = 'success', message }: ToastOptions) => {
      if (!message) {
        return;
      }
      clearTimer();
      idRef.current += 1;
      setCurrent({ id: idRef.current, type, message });
      translateY.value = withTiming(0, { duration: ANIM_MS });
      AccessibilityInfo.announceForAccessibility(message);
      timer.current = setTimeout(hide, TOAST_DURATION_MS);
    },
    [hide, translateY],
  );

  useEffect(() => clearTimer, []);

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dy) > 4,
        onPanResponderMove: (_e, g) => {
          translateY.value = Math.min(0, g.dy);
        },
        onPanResponderRelease: (_e, g) => {
          if (g.dy < SWIPE_DISMISS_DY || g.vy < -0.5) {
            hide();
          } else {
            translateY.value = withTiming(0, { duration: ANIM_MS });
          }
        },
      }),
    [hide, translateY],
  );

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));
  const api = useMemo<ToastApi>(
    () => ({
      show,
      hide,
      success: message => show({ type: 'success', message }),
      error: message => show({ type: 'error', message }),
    }),
    [show, hide],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {current && (
        <Animated.View
          pointerEvents="box-none"
          style={[styles.host, { top: insets.top + 8 }, animatedStyle]}
        >
          <View
            {...panResponder.panHandlers}
            testID="toast"
            style={styles.toast}
            accessible
            accessibilityRole="alert"
            accessibilityLiveRegion="polite"
            accessibilityLabel={current.message}
            accessibilityHint={strings.toast.dismissHint}
            accessibilityActions={[{ name: 'escape' }, { name: 'activate' }]}
            onAccessibilityAction={hide}
          >
            <ToastIcon
              type={current.type}
              size={ICON_SIZE}
              color={current.type === 'success' ? colors.accent.biometric : colors.status.error}
            />
            <AppText variant="subtitle" style={styles.message}>
              {current.message}
            </AppText>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast() must be used inside <ToastProvider>.');
  }
  return ctx;
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    host: { position: 'absolute', left: spacing.lg, right: spacing.lg, zIndex: 1000 },
    toast: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingVertical: 14,
      paddingHorizontal: spacing.lg,
      borderRadius: radius.card,
      backgroundColor: colors.surface.toast,
      borderWidth: 1,
      borderColor: colors.surface.toastBorder,
      shadowColor: colors.surface.shadow,
      shadowOpacity: 0.3,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 6 },
      elevation: 8,
    },
    message: { flex: 1 },
  });
