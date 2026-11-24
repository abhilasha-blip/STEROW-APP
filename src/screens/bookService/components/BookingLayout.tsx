import React, { useEffect, useRef, type PropsWithChildren } from 'react';
import { Platform, ScrollView, Settings, StyleSheet, View } from 'react-native';
import LightScreen from '@/components/LightScreen';
import LinkButton from '@/components/LinkButton';
import PrimaryButton from '@/components/PrimaryButton';
import { strings } from '@/constants/strings';
import BookingStepper from './BookingStepper';

const t = strings.bookService;

type Props = PropsWithChildren<{
  step: number;
  /** Header back arrow (and Android back): the previous step, or out of the flow from step 1. */
  onBack: () => void;
  primaryLabel?: string;
  onPrimary: () => void;
  primaryDisabled: boolean;
  primaryLoading?: boolean;
  /** The "Back" link under the button (steps 2–4). */
  showBackLink?: boolean;
  testID: string;
}>;

/**
 * DEV ONLY: `-qaScroll end` (or a y offset) scrolls the step after launch, so simulator screenshots can
 * show content below the fold (there is no UI automation on the QA machine). Inert in release builds.
 */
function qaScrollTarget(): 'end' | number | null {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return null;
  }
  try {
    const value = Settings.get('qaScroll');
    if (value === 'end') {
      return 'end';
    }
    const y = Number(value);
    return Number.isFinite(y) && y > 0 ? y : null;
  } catch {
    return null;
  }
}

/**
 * One Book a Service step (step1–4.svg): light "Book a Service" header with back arrow, the stepper pinned
 * under it, scrolling content, then Next / Submit (pinned above the tabs) and the violet "Back" link.
 */
export default function BookingLayout({
  step,
  onBack,
  primaryLabel = t.next,
  onPrimary,
  primaryDisabled,
  primaryLoading = false,
  showBackLink = true,
  testID,
  children,
}: Props) {
  const scrollRef = useRef<React.ComponentRef<typeof ScrollView>>(null);
  useEffect(() => {
    const target = qaScrollTarget();
    if (target === null) {
      return;
    }
    const timer = setTimeout(
      () => (target === 'end' ? scrollRef.current?.scrollToEnd({ animated: false }) : scrollRef.current?.scrollTo({ y: target, animated: false })),
      1200,
    );
    return () => clearTimeout(timer);
  }, []);

  return (
    <LightScreen
      testID={testID}
      title={t.title}
      onBack={onBack}
      aboveTabs
      scrollRef={scrollRef}
      subHeader={<BookingStepper current={step} />}
      footer={
        <View>
          <PrimaryButton
            testID={`${testID}-next`}
            label={primaryLabel}
            labelVariant="buttonStrong"
            onPress={onPrimary}
            disabled={primaryDisabled}
            loading={primaryLoading}
          />
          {showBackLink && (
            <LinkButton testID={`${testID}-back`} label={t.back} onPress={onBack} style={styles.back} />
          )}
        </View>
      }
    >
      {children}
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  back: { alignSelf: 'center', marginTop: 4 },
});
