import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import Check from '@/assets/icons/book-service/check.svg';
import CheckCircle from '@/assets/icons/check-circle.svg';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

type Props = {
  kind: 'radio' | 'checkbox';
  selected: boolean;
  disabled?: boolean;
  testID?: string;
};

/**
 * The 20pt radio / checkbox drawn in step1–4.1.svg. Unselected: mist fill with a 1.5pt slate ring
 * (checkbox r 3.25). Selected radio: the violet check-circle; selected checkbox: violet r4 square with a
 * white tick. Visual only: the row / card around it carries the accessibility role and state.
 */
function SelectionIndicator({ kind, selected, disabled = false, testID }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const dim = disabled && styles.disabled;
  if (kind === 'radio') {
    return selected ? (
      <CheckCircle testID={testID} width={20} height={20} color={colors.booking.controlSelected} style={dim} />
    ) : (
      <View testID={testID} style={[styles.box, styles.radio, dim]} />
    );
  }
  return (
    <View testID={testID} style={[styles.box, styles.checkbox, selected && styles.checked, dim]}>
      {selected && <Check width={20} height={20} color={colors.booking.controlMark} />}
    </View>
  );
}

export default memo(SelectionIndicator);

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    box: {
      width: 20,
      height: 20,
      borderWidth: 1.5,
      borderColor: colors.booking.controlBorder,
      backgroundColor: colors.booking.controlFill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    radio: { borderRadius: 10 },
    checkbox: { borderRadius: 4 },
    checked: { borderWidth: 0, backgroundColor: colors.booking.controlSelected },
    disabled: { opacity: 0.4 },
  });
