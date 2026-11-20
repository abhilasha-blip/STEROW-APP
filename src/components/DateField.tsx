import React, { useState } from 'react';
import { Platform, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import DateTimePicker, {
  DateTimePickerAndroid,
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import CalendarIcon from '@/assets/icons/calendar.svg';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import { formatDob, parseIsoDate, toIsoDate } from '@/utils/validation';
import BottomSheet from './BottomSheet';
import PrimaryButton from './PrimaryButton';
import TextField from './TextField';

type DateFieldProps = {
  label: string;
  /** "YYYY-MM-DD" or null. Displayed as DD-MM-YYYY. */
  value: string | null;
  onChange: (iso: string) => void;
  /** Called when the picker closes (with or without a change) – e.g. to validate "on blur". */
  onClose?: () => void;
  placeholder?: string;
  maximumDate?: Date;
  minimumDate?: Date;
  error?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const t = strings.onboarding.profile;

/**
 * Looks like TextField variant="light" with a calendar icon. Opens the native date picker:
 * Android's default dialog, or on iOS a spinner in a light bottom sheet with "Done".
 */
export default function DateField({
  label,
  value,
  onChange,
  onClose,
  placeholder = t.dobPlaceholder,
  maximumDate,
  minimumDate,
  error,
  testID = 'date-field',
  style,
}: DateFieldProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [iosOpen, setIosOpen] = useState(false);
  const [draft, setDraft] = useState<Date>(new Date());

  const initialDate = () => (value && parseIsoDate(value)) || maximumDate || new Date();
  const display = formatDob(value);

  const open = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: initialDate(),
        mode: 'date',
        maximumDate,
        minimumDate,
        onChange: (event: DateTimePickerEvent, date?: Date) => {
          if (event.type === 'set' && date) {
            onChange(toIsoDate(date));
          }
          onClose?.();
        },
      });
      return;
    }
    setDraft(initialDate());
    setIosOpen(true);
  };

  const closeIos = () => {
    setIosOpen(false);
    onClose?.();
  };

  return (
    <View style={style}>
      <Pressable
        testID={testID}
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${display || placeholder}`}
        accessibilityHint={error ?? t.dobPickerA11y}
      >
        <View pointerEvents="none">
          <TextField
            variant="light"
            label={label}
            value={display}
            placeholder={placeholder}
            editable={false}
            error={error}
            testID={`${testID}-input`}
            importantForAccessibility="no-hide-descendants"
            rightAccessory={
              <CalendarIcon
                width={sizes.iconSmall}
                height={sizes.iconSmall}
                color={colors.input.lightIcon}
                style={styles.icon}
              />
            }
          />
        </View>
      </Pressable>

      {Platform.OS === 'ios' && (
        <BottomSheet visible={iosOpen} onClose={closeIos} title={label} testID={`${testID}-sheet`}>
          <DateTimePicker
            testID={`${testID}-picker`}
            value={draft}
            mode="date"
            display="spinner"
            themeVariant="light"
            textColor={colors.text.onLight}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(_event, date) => date && setDraft(date)}
            style={styles.spinner}
          />
          <PrimaryButton
            testID={`${testID}-done`}
            label={t.dobDone}
            labelVariant="buttonStrong"
            showArrow={false}
            onPress={() => {
              onChange(toIsoDate(draft));
              closeIos();
            }}
            style={styles.done}
          />
        </BottomSheet>
      )}
    </View>
  );
}

const makeStyles = ({ spacing }: Theme) =>
  StyleSheet.create({
    // Figma: icon's right edge sits 25pt from the field's outer edge (1 border + 16 padding + 8).
    icon: { marginLeft: spacing.sm, marginRight: spacing.sm },
    spinner: { alignSelf: 'stretch', marginTop: spacing.sm },
    done: { marginTop: spacing.lg, marginBottom: spacing.lg },
  });
