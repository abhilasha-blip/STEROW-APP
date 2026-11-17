import React, {
  useCallback,
  useEffect,
  useRef,
  type PropsWithChildren,
  type RefObject,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { useScale } from '@/utils/scale';
import AuthBackground from './AuthBackground';

export type ViewRef = React.ComponentRef<typeof View>;

/** Top inset of the Figma frame (iPhone 16/17 Pro status bar). */
const DESIGN_SAFE_TOP = 62;

type ScreenContainerProps = PropsWithChildren<{
  car?: boolean;
  /** Y of the first element in the Figma frame (pt from the frame top). */
  designTop: number;
  /** Kept above the keyboard whenever it opens (e.g. the primary button). */
  keyboardAnchorRef?: RefObject<ViewRef | null>;
  contentStyle?: StyleProp<ViewStyle>;
}>;

const KEYBOARD_MARGIN = 16;

export default function ScreenContainer({
  car = false,
  designTop,
  keyboardAnchorRef,
  contentStyle,
  children,
}: ScreenContainerProps) {
  const insets = useSafeAreaInsets();
  const { spacing } = useTheme();
  const { s, vs } = useScale();
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ViewRef>(null);
  const viewportHeight = useRef(0);

  const revealAnchor = useCallback(() => {
    const anchor = keyboardAnchorRef?.current;
    const content = contentRef.current;
    if (!anchor || !content) {
      return;
    }
    anchor.measureLayout(content, (_x: number, y: number, _w: number, h: number) => {
      const target = y + h + KEYBOARD_MARGIN - viewportHeight.current;
      if (target > 0) {
        scrollRef.current?.scrollTo({ y: target, animated: true });
      }
    });
  }, [keyboardAnchorRef]);

  useEffect(() => {
    if (!keyboardAnchorRef) {
      return;
    }
    // Wait for KeyboardAvoidingView to shrink the viewport before measuring.
    const sub = Keyboard.addListener('keyboardDidShow', () => setTimeout(revealAnchor, 60));
    return () => sub.remove();
  }, [keyboardAnchorRef, revealAnchor]);

  const paddingTop = Math.max(insets.top + vs(designTop - DESIGN_SAFE_TOP), spacing.sm);

  return (
    <View style={styles.root}>
      <AuthBackground car={car} />
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          onLayout={e => {
            viewportHeight.current = e.nativeEvent.layout.height;
          }}
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop,
              paddingBottom: insets.bottom + spacing.xl,
              paddingHorizontal: s(spacing.screenPaddingH),
            },
          ]}
        >
          {/* Tap on empty space dismisses the keyboard. A responder View (not a Touchable) so it
              doesn't become one merged accessibility node; children still get their own taps. */}
          <View
            ref={contentRef}
            style={[styles.content, contentStyle]}
            onStartShouldSetResponder={() => true}
            onResponderRelease={Keyboard.dismiss}
          >
            {children}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  content: { flexGrow: 1 },
});
