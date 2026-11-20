import React, { useCallback, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {
  GestureDetector,
  GestureHandlerRootView,
  usePanGesture,
} from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scheduleOnRN } from 'react-native-worklets';
import { strings } from '@/constants/strings';
import { useThemedStyles, type Theme } from '@/theme';
import AppText from './AppText';
import IconCircleButton from './IconCircleButton';

export type BottomSheetProps = PropsWithChildren<{
  visible: boolean;
  /** Backdrop tap, close (X), swipe down and Android back all call this; the parent hides the sheet. */
  onClose: () => void;
  /**
   * Fires once the sheet is fully dismissed. Present native UI (e.g. the image picker) from here:
   * iOS can't present a view controller while a modal is still dismissing.
   */
  onClosed?: () => void;
  title?: string;
  /** Hide the close (X) button (e.g. small action sheets). */
  showClose?: boolean;
  /**
   * The content scrolls (e.g. a SelectField list): drag-to-close is limited to the title row so the
   * list's own scrolling isn't taken over by the sheet.
   */
  scrollableContent?: boolean;
  testID?: string;
  contentStyle?: StyleProp<ViewStyle>;
}>;

const IN_MS = 280;
const OUT_MS = 220;
/** Drag further than this fraction of the sheet height (or fling faster) to close. */
const CLOSE_FRACTION = 0.25;
const CLOSE_VELOCITY = 1000;
/** iOS fallback if Modal.onDismiss doesn't arrive (it isn't emitted under Jest either). */
const DISMISS_FALLBACK_MS = 400;

/**
 * Light bottom sheet (onboarding): dim backdrop, sheet-light background, 20pt top radius, optional
 * title + close (X). Slides up on open and down on close; drag down to dismiss.
 */
export default function BottomSheet({
  visible,
  onClose,
  onClosed,
  title,
  showClose = true,
  scrollableContent = false,
  testID,
  contentStyle,
  children,
}: BottomSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { height: windowHeight } = useWindowDimensions();

  const [mounted, setMounted] = useState(visible);
  const translateY = useSharedValue(windowHeight);
  const backdrop = useSharedValue(0);
  const sheetHeight = useSharedValue(windowHeight);

  const onClosedRef = useRef(onClosed);
  onClosedRef.current = onClosed;
  const closedFired = useRef(true);

  const fireClosed = useCallback(() => {
    if (!closedFired.current) {
      closedFired.current = true;
      onClosedRef.current?.();
    }
  }, []);

  const unmount = useCallback(() => setMounted(false), []);

  useEffect(() => {
    if (visible) {
      closedFired.current = false;
      setMounted(true);
      translateY.value = withTiming(0, { duration: IN_MS, easing: Easing.out(Easing.cubic) });
      backdrop.value = withTiming(1, { duration: IN_MS });
    } else if (mounted) {
      backdrop.value = withTiming(0, { duration: OUT_MS });
      translateY.value = withTiming(
        sheetHeight.value,
        { duration: OUT_MS, easing: Easing.in(Easing.cubic) },
        finished => {
          if (finished) {
            scheduleOnRN(unmount);
          }
        },
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- shared values are stable refs
  }, [visible]);

  // After the Modal is gone: Android has no onDismiss, iOS gets a fallback in case it never fires.
  useEffect(() => {
    if (mounted || closedFired.current) {
      return;
    }
    if (Platform.OS !== 'ios') {
      fireClosed();
      return;
    }
    const timer = setTimeout(fireClosed, DISMISS_FALLBACK_MS);
    return () => clearTimeout(timer);
  }, [mounted, fireClosed]);

  const requestClose = useCallback(() => onClose(), [onClose]);

  const pan = usePanGesture({
    // Only a downward drag activates; horizontal movement lets taps / scrolls win.
    activeOffsetY: 8,
    failOffsetX: [-20, 20],
    onUpdate: e => {
      'worklet';
      const y = Math.max(0, e.translationY);
      translateY.value = y;
      backdrop.value = 1 - Math.min(1, y / Math.max(1, sheetHeight.value));
    },
    onDeactivate: e => {
      'worklet';
      if (e.translationY > sheetHeight.value * CLOSE_FRACTION || e.velocityY > CLOSE_VELOCITY) {
        scheduleOnRN(requestClose);
      } else {
        translateY.value = withSpring(0, { damping: 20, stiffness: 220 });
        backdrop.value = withTiming(1, { duration: 150 });
      }
    },
  });

  const backdropStyle = useAnimatedStyle(() => ({ opacity: backdrop.value }));
  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: translateY.value }] }));

  const header =
    title || showClose ? (
      <View style={styles.header}>
        <AppText
          variant="sheetTitle"
          color="text.onLight"
          style={styles.title}
          accessibilityRole="header"
          numberOfLines={1}
        >
          {title ?? ''}
        </AppText>
        {showClose && (
          <IconCircleButton
            testID={testID ? `${testID}-close` : undefined}
            onPress={requestClose}
            accessibilityLabel={strings.common.close}
          />
        )}
      </View>
    ) : null;

  const sheet = (
    <Animated.View
      testID={testID}
      accessibilityViewIsModal
      onLayout={e => {
        sheetHeight.value = e.nativeEvent.layout.height;
      }}
      style={[
        styles.sheet,
        { paddingBottom: Math.max(insets.bottom - 22, 12) },
        sheetStyle,
        contentStyle,
      ]}
    >
      {scrollableContent && header ? <GestureDetector gesture={pan}>{header}</GestureDetector> : header}
      {children}
    </Animated.View>
  );

  return (
    <Modal
      visible={mounted}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={requestClose}
      onDismiss={fireClosed}
    >
      <GestureHandlerRootView style={styles.root}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.backdrop, backdropStyle]}>
          <Pressable
            testID={testID ? `${testID}-backdrop` : undefined}
            style={StyleSheet.absoluteFill}
            onPress={requestClose}
            accessibilityRole="button"
            accessibilityLabel={strings.common.close}
          />
        </Animated.View>
        <KeyboardAvoidingView
          style={styles.keyboard}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          pointerEvents="box-none"
        >
          {scrollableContent ? sheet : <GestureDetector gesture={pan}>{sheet}</GestureDetector>}
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    keyboard: { flex: 1, justifyContent: 'flex-end' },
    backdrop: { backgroundColor: colors.surface.scrimLight },
    sheet: {
      backgroundColor: colors.surface.sheetLight,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      paddingHorizontal: spacing.screenPaddingH,
      paddingTop: spacing.xl,
    },
    header: { flexDirection: 'row', alignItems: 'center', minHeight: 32 },
    title: { flex: 1, marginRight: spacing.md },
  });
