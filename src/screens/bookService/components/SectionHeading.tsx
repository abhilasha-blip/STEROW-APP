import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import AppText from '@/components/AppText';

type Props = {
  title: string;
  subtitle?: string;
  /** Right of the title (e.g. "Speak", the filter button). */
  right?: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/** "Choose Vehicle" (SemiBold 17, brown) + subtitle (Regular 14, grey) 4pt below. */
function SectionHeading({ title, subtitle, right, style, testID }: Props) {
  return (
    <View testID={testID} style={[styles.row, style]}>
      <View style={styles.text}>
        <AppText variant="bookingTitle" color="booking.title" accessibilityRole="header">
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="body" color="booking.subtitle" style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      {right}
    </View>
  );
}

export default memo(SectionHeading);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  text: { flex: 1 },
  subtitle: { marginTop: 2 },
});
