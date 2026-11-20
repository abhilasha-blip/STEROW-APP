import React from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/AppText';
import { COUNTRY_LIST, type CountryCode } from '@/constants/countries';
import { strings } from '@/constants/strings';
import { useThemedStyles, type Theme } from '@/theme';

type Props = {
  visible: boolean;
  selected: CountryCode;
  onSelect: (country: CountryCode) => void;
  onClose: () => void;
};

const t = strings.mobileEntry;

/** Bottom sheet listing the supported countries: flag, name, dial code and a check on the selected one. */
export default function CountrySheet({ visible, selected, onSelect, onClose }: Props) {
  const styles = useThemedStyles(makeStyles);
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.root}>
        <Pressable
          testID="country-sheet-scrim"
          style={StyleSheet.absoluteFill}
          onPress={onClose}
          accessibilityRole="button"
          accessibilityLabel={strings.common.close}
        />
        <View testID="country-sheet" style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.handle} />
          <AppText variant="label" style={styles.title} accessibilityRole="header">
            {t.countrySheetTitle}
          </AppText>
          {COUNTRY_LIST.map(c => {
            const isSelected = c.code === selected;
            const name = t.countryNames[c.code];
            return (
              <Pressable
                key={c.code}
                testID={`country-option-${c.code}`}
                onPress={() => onSelect(c.code)}
                accessibilityRole="radio"
                accessibilityLabel={t.countryOptionA11y(name, c.dialCode)}
                accessibilityState={{ selected: isSelected, checked: isSelected }}
                style={({ pressed }) => [styles.option, pressed && styles.pressed]}
              >
                <AppText variant="inputLarge" style={styles.flag} importantForAccessibility="no">
                  {c.flag}
                </AppText>
                <AppText variant="bodyLarge" style={styles.name} numberOfLines={1}>
                  {name}
                </AppText>
                <AppText variant="bodyLarge" color="text.secondary">
                  {`+${c.dialCode}`}
                </AppText>
                <View style={styles.checkSlot}>
                  {isSelected && (
                    <AppText testID={`country-check-${c.code}`} variant="smallStrong" color="primary.main">
                      {t.countryCheck}
                    </AppText>
                  )}
                </View>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = ({ colors, radius, spacing, sizes }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, justifyContent: 'flex-end', backgroundColor: colors.surface.scrim },
    sheet: {
      backgroundColor: colors.surface.sheet,
      borderTopLeftRadius: radius.xl,
      borderTopRightRadius: radius.xl,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.surface.sheetBorder,
      paddingHorizontal: spacing.screenPaddingH,
      paddingTop: spacing.md,
    },
    handle: {
      alignSelf: 'center',
      width: 40,
      height: 4,
      borderRadius: radius.pill,
      backgroundColor: colors.surface.handle,
      marginBottom: spacing.lg,
    },
    title: { marginBottom: spacing.sm },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: sizes.inputHeight,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surface.divider,
    },
    pressed: { opacity: 0.6 },
    flag: { marginRight: spacing.md },
    name: { flex: 1, marginRight: spacing.sm },
    checkSlot: { width: 28, alignItems: 'flex-end' },
  });
