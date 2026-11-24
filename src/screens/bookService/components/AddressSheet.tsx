import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from 'react-native';
import Pin from '@/assets/icons/book-service/pin.svg';
import AppText from '@/components/AppText';
import BottomSheet from '@/components/BottomSheet';
import LinkButton from '@/components/LinkButton';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import { strings } from '@/constants/strings';
import type { Address } from '@/services/bookingService';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import SelectionIndicator from './SelectionIndicator';

const t = strings.bookService.address;
const MIN_ADDRESS_LENGTH = 10;

type Props = {
  visible: boolean;
  /** Saved (mock) + added this session. */
  addresses: Address[];
  loading: boolean;
  selectedId: string | null;
  onSelect: (address: Address) => void;
  /** "Add new address" → Save: added to the booking's list and selected. */
  onAdd: (address: Address) => void;
  onClose: () => void;
  testID?: string;
};

/**
 * Pickup / drop address picker (no Figma): saved addresses as radio rows, then "Add new address" with a
 * text field and a map-pin placeholder (no map yet). Picking or saving closes the sheet.
 */
export default function AddressSheet({ visible, addresses, loading, selectedId, onSelect, onAdd, onClose, testID = 'address-sheet' }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { height } = useWindowDimensions();
  const [adding, setAdding] = useState(false);
  const [line, setLine] = useState('');
  useEffect(() => {
    if (visible) {
      setAdding(false);
      setLine('');
    }
  }, [visible]);
  const valid = line.trim().length >= MIN_ADDRESS_LENGTH;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.title} testID={testID} scrollableContent>
      <ScrollView style={{ maxHeight: height * 0.7 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <AppText variant="fieldLabel" color="booking.subtitle" style={styles.label}>
          {t.saved}
        </AppText>
        {loading ? (
          <ActivityIndicator color={colors.input.lightSpinner} style={styles.loading} />
        ) : addresses.length === 0 ? (
          <AppText variant="body" color="booking.subtitle">
            {t.noSaved}
          </AppText>
        ) : (
          <View accessibilityRole="radiogroup" accessibilityLabel={t.saved}>
            {addresses.map(a => {
              const selected = a.id === selectedId;
              return (
                <Pressable
                  key={a.id}
                  testID={`${testID}-option-${a.id}`}
                  onPress={() => {
                    onSelect(a);
                    onClose();
                  }}
                  accessibilityRole="radio"
                  accessibilityLabel={a.label ? `${a.label}, ${a.line}` : a.line}
                  accessibilityState={{ checked: selected }}
                  style={styles.row}
                >
                  <Pin width={24} height={24} color={colors.booking.fieldIcon} />
                  <View style={styles.rowText}>
                    {!!a.label && (
                      <AppText variant="rowTitle" color="booking.text">
                        {a.label}
                      </AppText>
                    )}
                    <AppText variant="body" color="booking.meta">
                      {a.line}
                    </AppText>
                  </View>
                  <SelectionIndicator kind="radio" selected={selected} />
                </Pressable>
              );
            })}
          </View>
        )}

        {adding ? (
          <View testID={`${testID}-new`} style={styles.newBox}>
            <TextField
              testID={`${testID}-new-input`}
              variant="light"
              label={t.newLabel}
              value={line}
              onChangeText={setLine}
              placeholder={t.newPlaceholder}
              autoFocus
              error={line.length > 0 && !valid ? t.tooShort : undefined}
            />
            <View style={styles.map} accessible accessibilityLabel={t.mapPlaceholder}>
              <Pin width={32} height={32} color={colors.booking.link} />
              <AppText variant="meta" color="booking.subtitle" style={styles.mapText}>
                {t.mapPlaceholder}
              </AppText>
            </View>
            <PrimaryButton
              testID={`${testID}-new-save`}
              label={t.save}
              labelVariant="buttonStrong"
              showArrow={false}
              disabled={!valid}
              onPress={() => {
                const address = { id: `new-${Date.now()}`, line: line.trim().replace(/\s+/g, ' ') };
                onAdd(address);
                onClose();
              }}
              style={styles.save}
            />
          </View>
        ) : (
          <LinkButton testID={`${testID}-add`} label={`+ ${t.addNew}`} onPress={() => setAdding(true)} style={styles.add} />
        )}
      </ScrollView>
    </BottomSheet>
  );
}

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    label: { marginTop: 16, marginBottom: 4 },
    loading: { marginVertical: 16 },
    row: { flexDirection: 'row', alignItems: 'center', minHeight: 56, gap: 12 },
    rowText: { flex: 1 },
    add: { alignSelf: 'flex-start', marginTop: 8, marginBottom: 8 },
    newBox: { marginTop: 16, marginBottom: 8 },
    map: {
      marginTop: 12,
      height: 120,
      borderRadius: radius.field,
      backgroundColor: colors.booking.mapPlaceholder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    mapText: { marginTop: 6 },
    save: { marginTop: 16 },
  });
