import React from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import CheckCircleIcon from '@/assets/icons/check-circle.svg';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import AppText from './AppText';

export type ChipOption<T extends string = string> = { value: T; label: string };

export type ChipGroupProps<T extends string> = {
  /** Field label above the chips ("Fuel Type"); also the radio group's accessibility label. */
  label: string;
  options: readonly ChipOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Single-select pill chips, measured from step2-number-autofill.svg: 40pt tall, 8pt gaps, wrapping.
 * Unselected: white fill, 1pt mist border, muted Regular 14. Selected: 1pt violet border, dark
 * SemiBold 14, a 16pt violet check-circle 8pt after the label and a soft drop shadow (y 4, blur 8, 12%).
 */
export default function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  testID = 'chips',
  style,
}: ChipGroupProps<T>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={style}>
      <AppText
        variant="fieldLabel"
        color="text.onLight"
        style={styles.label}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </AppText>
      <View testID={testID} style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={label}>
        {options.map(option => {
          const selected = option.value === value;
          return (
            <Pressable
              key={option.value}
              testID={`${testID}-${option.value}`}
              onPress={() => onChange(option.value)}
              accessibilityRole="radio"
              accessibilityLabel={option.label}
              accessibilityState={{ checked: selected, selected }}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <AppText
                variant={selected ? 'chipSelected' : 'chip'}
                color={selected ? 'text.onLight' : 'text.onLightMuted'}
              >
                {option.label}
              </AppText>
              {selected && (
                <CheckCircleIcon
                  testID={`${testID}-${option.value}-check`}
                  width={16}
                  height={16}
                  color={colors.chip.selectedIcon}
                  style={styles.check}
                />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const makeStyles = ({ colors, radius, sizes }: Theme) =>
  StyleSheet.create({
    label: { marginBottom: 8 },
    row: { flexDirection: 'row', flexWrap: 'wrap', gap: sizes.chipGap },
    chip: {
      height: sizes.chipHeight,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.chip.border,
      backgroundColor: colors.chip.background,
      // Figma: the ink starts 18pt from the outer edge. RN's text box adds ~1pt of side bearing on
      // each side, so 16 + the 1pt border lands the ink there (and keeps 4 fuel chips on one row).
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
    },
    chipSelected: {
      borderColor: colors.chip.selectedBorder,
      // The check-circle ends 17pt from the outer edge.
      paddingRight: 16,
      shadowColor: colors.surface.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 4,
      elevation: Platform.OS === 'android' ? 3 : 0,
    },
    // ~7pt from the label's ink (the text box's trailing bearing makes up the rest).
    check: { marginLeft: 6 },
    pressed: { opacity: 0.8 },
  });
