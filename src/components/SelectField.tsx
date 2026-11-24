import React, { useMemo, useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import CheckCircleIcon from '@/assets/icons/check-circle.svg';
import ChevronDownIcon from '@/assets/icons/chevron-down.svg';
import SearchIcon from '@/assets/icons/search.svg';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import TextField from './TextField';

export type SelectOption = { value: string; label: string };

export type SelectFieldProps = {
  label: string;
  /** Don't draw the label (it still names the field for screen readers and titles the sheet). */
  labelHidden?: boolean;
  options: readonly SelectOption[];
  value: string | null;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Not tappable, muted text/chevron and a faded field (e.g. "Vehicle Model" until a make is chosen). */
  disabled?: boolean;
  /** Options are being fetched: spinner instead of the chevron, not tappable. */
  loading?: boolean;
  error?: string;
  /** Open the list on mount (dev QA screenshots). */
  defaultOpen?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** Lists longer than this get a search box (per spec). */
export const SELECT_SEARCH_THRESHOLD = 8;

const s = strings.onboarding.select;

/**
 * Looks like TextField variant="light" with "Select" and a chevron-down (step2-number-autofill.svg:
 * 16pt glyph, right edge 25pt from the field edge, like DateField's calendar). Opens a light bottom
 * sheet titled with the label: an optional search box, then the options with a check on the selected row.
 */
export default function SelectField({
  label,
  labelHidden = false,
  options,
  value,
  onChange,
  placeholder = s.placeholder,
  disabled = false,
  loading = false,
  error,
  defaultOpen = false,
  testID = 'select',
  style,
}: SelectFieldProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { height: windowHeight } = useWindowDimensions();
  const [open, setOpen] = useState(defaultOpen);
  const [query, setQuery] = useState('');

  const selected = options.find(o => o.value === value);
  const searchable = options.length > SELECT_SEARCH_THRESHOLD;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter(o => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  const inactive = disabled || loading;
  const close = () => setOpen(false);

  return (
    <View style={style}>
      <Pressable
        testID={testID}
        onPress={() => {
          setQuery('');
          setOpen(true);
        }}
        disabled={inactive}
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected?.label ?? placeholder}`}
        accessibilityHint={error ?? s.openHint}
        accessibilityState={{ disabled: inactive, busy: loading, expanded: open }}
      >
        <View pointerEvents="none">
          <TextField
            variant="light"
            label={label}
            labelHidden={labelHidden}
            value={selected?.label ?? ''}
            placeholder={placeholder}
            editable={false}
            error={error}
            loading={loading}
            disabled={disabled}
            testID={`${testID}-input`}
            importantForAccessibility="no-hide-descendants"
            rightAccessory={
              <ChevronDownIcon
                width={sizes.iconSmall}
                height={sizes.iconSmall}
                color={disabled ? colors.text.onLightMuted : colors.input.lightIcon}
                style={styles.chevron}
              />
            }
          />
        </View>
      </Pressable>

      <BottomSheet
        visible={open}
        onClose={close}
        title={label}
        scrollableContent
        testID={`${testID}-sheet`}
      >
        {searchable && (
          <TextField
            variant="light"
            label={s.searchLabel}
            style={styles.search}
            labelHidden
            testID={`${testID}-search`}
            value={query}
            onChangeText={setQuery}
            placeholder={s.searchPlaceholder}
            autoCorrect={false}
            autoCapitalize="none"
            returnKeyType="search"
            leftIcon={<SearchIcon width={16} height={16} color={colors.text.onLightMuted} />}
          />
        )}
        <FlatList
          testID={`${testID}-list`}
          data={visible}
          keyExtractor={o => o.value}
          keyboardShouldPersistTaps="handled"
          style={[styles.list, { maxHeight: windowHeight * 0.5 }]}
          ItemSeparatorComponent={Separator}
          ListEmptyComponent={
            <AppText variant="body" color="text.onLightMuted" style={styles.empty}>
              {s.noResults}
            </AppText>
          }
          renderItem={({ item }) => {
            const isSelected = item.value === value;
            return (
              <Pressable
                testID={`${testID}-option-${item.value}`}
                onPress={() => {
                  if (!isSelected) {
                    onChange(item.value);
                  }
                  close();
                }}
                accessibilityRole="button"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: isSelected }}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <AppText
                  variant={isSelected ? 'chipSelected' : 'body'}
                  color="text.onLight"
                  style={styles.rowLabel}
                  numberOfLines={1}
                >
                  {item.label}
                </AppText>
                {isSelected && (
                  <CheckCircleIcon
                    testID={`${testID}-option-${item.value}-check`}
                    width={20}
                    height={20}
                    color={colors.chip.selectedIcon}
                  />
                )}
              </Pressable>
            );
          }}
        />
      </BottomSheet>
    </View>
  );
}

function Separator() {
  const styles = useThemedStyles(makeStyles);
  return <View style={styles.separator} />;
}

const makeStyles = ({ colors, spacing, sizes }: Theme) =>
  StyleSheet.create({
    // Same place as DateField's calendar icon.
    chevron: { marginLeft: spacing.sm, marginRight: spacing.sm },
    search: { marginTop: spacing.lg },
    list: { marginTop: spacing.sm, flexGrow: 0 },
    row: {
      minHeight: sizes.inputHeightLight + 4,
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: spacing.sm,
    },
    rowLabel: { flex: 1, marginRight: spacing.md },
    pressed: { opacity: 0.6 },
    separator: { height: 1, backgroundColor: colors.surface.dividerLight },
    empty: { paddingVertical: spacing.lg, textAlign: 'center' },
  });
