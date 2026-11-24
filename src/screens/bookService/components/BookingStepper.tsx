import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Check from '@/assets/icons/book-service/check.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const t = strings.bookService;
export const BOOKING_STEP_COUNT = t.steps.length;

type Props = {
  /** 1-based current step. */
  current: number;
  testID?: string;
};

/**
 * The 4-step header (step1–4.svg, the 87pt band at y 112): four 96.5pt columns from x 7.75, each a 32pt
 * circle with 32.25pt half-lines either side and a 12pt label 11pt below. Done = violet + white check,
 * current = violet + white number, upcoming = white + grey number. Lines into a reached step are violet,
 * the rest slate 50%. Same role as the onboarding ProgressBar: one progressbar for screen readers.
 */
function BookingStepper({ current, testID = 'booking-stepper' }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const label = t.steps[current - 1];
  return (
    <View
      testID={testID}
      style={styles.row}
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={t.stepperA11y(current, BOOKING_STEP_COUNT, label)}
      accessibilityValue={{ min: 1, max: BOOKING_STEP_COUNT, now: current }}
    >
      {t.steps.map((name, i) => {
        const step = i + 1;
        const state = step < current ? 'done' : step === current ? 'current' : 'upcoming';
        const reached = step <= current;
        const a11y =
          state === 'done' ? t.stepDoneA11y(name) : state === 'current' ? t.stepCurrentA11y(name) : t.stepUpcomingA11y(name);
        return (
          <View key={name} testID={`${testID}-${step}`} accessibilityLabel={a11y} style={styles.column}>
            <View style={styles.track}>
              <View style={[styles.line, i === 0 && styles.hidden, reached ? styles.lineOn : styles.lineOff]} />
              <View
                testID={`${testID}-${step}-${state}`}
                style={[styles.circle, state === 'upcoming' ? styles.circleUpcoming : styles.circleActive]}
              >
                {state === 'done' ? (
                  <Check width={20} height={20} color={colors.booking.stepActiveText} />
                ) : (
                  <AppText
                    variant="stepNumber"
                    color={state === 'current' ? 'booking.stepActiveText' : 'booking.stepUpcomingText'}
                  >
                    {step}
                  </AppText>
                )}
              </View>
              <View
                style={[
                  styles.line,
                  step === BOOKING_STEP_COUNT && styles.hidden,
                  step < current ? styles.lineOn : styles.lineOff,
                ]}
              />
            </View>
            <AppText
              variant={reached ? 'stepLabel' : 'stepLabelMuted'}
              color={reached ? 'booking.stepLabel' : 'booking.stepLabelUpcoming'}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.85}
              style={styles.label}
            >
              {name}
            </AppText>
          </View>
        );
      })}
    </View>
  );
}

export default memo(BookingStepper);

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    // The band starts 112 − 90 (header) ≈ 22pt under the title row and ends 24pt above the section title.
    row: { flexDirection: 'row', paddingHorizontal: 7.75, paddingBottom: 18, backgroundColor: colors.booking.background },
    column: { flex: 1, alignItems: 'center' },
    track: { flexDirection: 'row', alignItems: 'center', alignSelf: 'stretch' },
    line: { flex: 1, height: 1 },
    lineOn: { backgroundColor: colors.booking.stepLine },
    lineOff: { backgroundColor: colors.booking.stepLineUpcoming },
    hidden: { opacity: 0 },
    circle: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    circleActive: { backgroundColor: colors.booking.stepActive },
    circleUpcoming: { backgroundColor: colors.booking.stepUpcoming },
    label: { marginTop: 11 },
  });
