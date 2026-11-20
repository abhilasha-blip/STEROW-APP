import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type PropsWithChildren,
  type ReactNode,
} from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { strings } from '@/constants/strings';
import { useThemedStyles, type Theme } from '@/theme';
import { useScale } from '@/utils/scale';
import AppText from './AppText';

import BackButton from './BackButton';
import OnboardingBackground from './OnboardingBackground';
import ProgressBar from './ProgressBar';

type ViewRef = React.ComponentRef<typeof View>;

export type OnboardingLayoutProps = PropsWithChildren<{
  step: number;
  totalSteps: number;
  title: string;
  subtitle?: string;
  /** Pinned below the content inside the scrolling sheet (Next + Skip). */
  footer?: ReactNode;
  /** Minimum space between the last field and the footer (Figma varies per frame; default 49). */
  footerGap?: number;
  onBack?: () => void;
  testID?: string;
}>;

/** Figma frame values (design/onboarding, 402 pt wide). */
const DESIGN_SAFE_TOP = 62;
const HEADER_TOP = 60;
const GAP = {
  /** Back-button row bottom (108) → title line box top (139.2). */
  title: 31.2,
  /** Title line box bottom → subtitle line box top. */
  subtitle: 5.1,
  /** Subtitle line box bottom → sheet top (217). */
  sheet: 20.7,
  /** Last field bottom → primary button top. */
  footer: 49,
};
const KEYBOARD_MARGIN = 16;

/**
 * Steps 2–4 open with a field label: Figma puts its cap height 33.6pt below the sheet top (217 → 250.6),
 * i.e. the label's line box starts 5.3pt below the 24pt content padding.
 */
export const FIRST_LABEL_OFFSET = 5.3;

/** Lets fields ask the layout to scroll them (and the footer, when it fits) above the keyboard. */
const RevealContext = createContext<() => void>(() => undefined);
export const useRevealOnFocus = () => useContext(RevealContext);

/**
 * Onboarding shell: dark header (OnboardingBackground: flat base + violet glows) with back button, progress bar and "1/4",
 * centred title/subtitle; then a light sheet (20pt top radius) that fills the screen and scrolls.
 */
export default function OnboardingLayout({
  step,
  totalSteps,
  title,
  subtitle,
  footer,
  footerGap = GAP.footer,
  onBack,
  testID = 'onboarding-layout',
  children,
}: OnboardingLayoutProps) {
  const insets = useSafeAreaInsets();
  const { vs } = useScale();
  const styles = useThemedStyles(makeStyles);

  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const contentRef = useRef<ViewRef>(null);
  const footerRef = useRef<ViewRef>(null);
  const viewportHeight = useRef(0);
  const scrollY = useRef(0);

  const reveal = useCallback(() => {
    // Let KeyboardAvoidingView shrink the viewport first.
    setTimeout(() => {
      const content = contentRef.current;
      const focused = TextInput.State.currentlyFocusedInput() as unknown as ViewRef | null;
      if (!content || !focused) {
        return;
      }
      focused.measureLayout(content, (_x: number, fy: number, _w: number, fh: number) => {
        const viewport = viewportHeight.current;
        const scrollTo = (footerBottom: number | null) => {
          // Keep the whole field visible; also bring the footer in while the field still fits.
          const fieldBottom = fy + fh + KEYBOARD_MARGIN;
          const wanted =
            footerBottom === null
              ? fieldBottom
              : Math.max(fieldBottom, Math.min(footerBottom, fy - KEYBOARD_MARGIN + viewport));
          const target = Math.max(0, wanted - viewport);
          const fieldHidden = fy < scrollY.current || fieldBottom > scrollY.current + viewport;
          if (fieldHidden || target > scrollY.current) {
            scrollRef.current?.scrollTo({ y: target, animated: true });
          }
        };
        const footerView = footerRef.current;
        if (!footerView) {
          scrollTo(null);
          return;
        }
        footerView.measureLayout(
          content,
          (_fx: number, y: number, _fw: number, h: number) => scrollTo(y + h + KEYBOARD_MARGIN),
          () => scrollTo(null),
        );
      });
    }, 80);
  }, []);

  useEffect(() => {
    const sub = Keyboard.addListener('keyboardDidShow', reveal);
    return () => sub.remove();
  }, [reveal]);

  const paddingTop = Math.max(insets.top + vs(HEADER_TOP - DESIGN_SAFE_TOP), 8);
  const progress = useMemo(() => (totalSteps > 0 ? step / totalSteps : 0), [step, totalSteps]);

  return (
    <View style={styles.root} testID={testID}>
      <OnboardingBackground />
      <View style={[styles.header, { paddingTop }]}>
        <View style={styles.row}>
          <BackButton onPress={onBack} />
          <ProgressBar testID="onboarding-progress" value={progress} style={styles.progress} />
          <AppText
            testID="onboarding-step"
            variant="stepCurrent"
            color="text.stepCurrent"
            style={styles.step}
            accessibilityLabel={strings.onboarding.stepLabelA11y(step, totalSteps)}
          >
            {String(step)}
            <AppText variant="stepTotal" color="text.onLightMuted">
              {`/${totalSteps}`}
            </AppText>
          </AppText>
        </View>
        <AppText
          variant="screenTitle"
          style={[styles.center, { marginTop: vs(GAP.title) }]}
          accessibilityRole="header"
        >
          {title}
        </AppText>
        {!!subtitle && (
          <AppText
            variant="subtitle"
            color="text.onLightMuted"
            style={[styles.center, { marginTop: vs(GAP.subtitle) }]}
          >
            {subtitle}
          </AppText>
        )}
      </View>

      <KeyboardAvoidingView
        style={[styles.sheet, { marginTop: vs(GAP.sheet) }]}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          ref={scrollRef}
          testID={`${testID}-scroll`}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={32}
          onScroll={e => {
            scrollY.current = e.nativeEvent.contentOffset.y;
          }}
          onLayout={e => {
            viewportHeight.current = e.nativeEvent.layout.height;
          }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom - 22, 12) },
          ]}
        >
          <View ref={contentRef} style={styles.content}>
            <RevealContext.Provider value={reveal}>{children}</RevealContext.Provider>
            {footer ? (
              <>
                <View style={[styles.spacer, { minHeight: footerGap }]} />
                <View ref={footerRef} style={styles.footer}>
                  {footer}
                </View>
              </>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    root: { flex: 1 },
    header: { paddingHorizontal: spacing.screenPaddingH },
    row: { flexDirection: 'row', alignItems: 'center' },
    progress: { flex: 1, marginLeft: 16, marginRight: 24 },
    // "1/4" ends ~8.6pt short of the 24pt screen margin in Figma.
    step: { marginRight: 8.5 },
    center: { textAlign: 'center' },
    sheet: {
      flex: 1,
      backgroundColor: colors.surface.sheetLight,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      overflow: 'hidden',
    },
    scrollContent: {
      flexGrow: 1,
      paddingTop: spacing.xl,
      paddingHorizontal: spacing.screenPaddingH,
    },
    content: { flexGrow: 1 },
    spacer: { flexGrow: 1 },
    footer: {},
  });
