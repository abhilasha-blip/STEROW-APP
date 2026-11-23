import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import CheckCircle from '@/assets/icons/check-circle.svg';
import Car from '@/assets/icons/dashboard/car.svg';
import AppText from '@/components/AppText';
import BottomSheet from '@/components/BottomSheet';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import type { VehicleOption } from './VehicleSelectCard';

const d = strings.onboarding.documents;

export type VehiclePickerSheetProps = {
  visible: boolean;
  vehicles: readonly VehicleOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** "+ Add new vehicle" (omit to hide it). */
  onAdd?: () => void;
  onClose: () => void;
  onClosed?: () => void;
  testID?: string;
  /** Options are `${prefix}-option-<id>`, the add row `${prefix}-add`. */
  optionTestIDPrefix?: string;
};

/** Bottom sheet listing the user's vehicles (✓ on the selected one) + optional "Add new vehicle". */
export default function VehiclePickerSheet({
  visible,
  vehicles,
  selectedId,
  onSelect,
  onAdd,
  onClose,
  onClosed,
  testID = 'vehicle-picker',
  optionTestIDPrefix = 'vehicle-picker',
}: VehiclePickerSheetProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <BottomSheet testID={testID} visible={visible} title={d.vehicleSheetTitle} onClose={onClose} onClosed={onClosed}>
      <View style={styles.list}>
        {vehicles.map(v => {
          const active = v.id === selectedId;
          return (
            <Pressable
              key={v.id}
              testID={`${optionTestIDPrefix}-option-${v.id}`}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              onPress={() => onSelect(v.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={v.name ? `${v.vehicleNumber} (${v.name})` : v.vehicleNumber}
            >
              <View style={styles.carTile}>
                <Car width={20} height={20} color={colors.documents.icon} />
              </View>
              <View style={styles.rowText}>
                <AppText variant="cardTitle" color="text.onLight">
                  {v.vehicleNumber}
                </AppText>
                {!!v.name && (
                  <AppText variant="cardSubtitle" color="text.onLightMuted">
                    {v.name}
                  </AppText>
                )}
              </View>
              {active && <CheckCircle width={20} height={20} color={colors.chip.selectedIcon} />}
            </Pressable>
          );
        })}
        {onAdd && (
          <Pressable
            testID={`${optionTestIDPrefix}-add`}
            style={({ pressed }) => [styles.row, styles.addRow, pressed && styles.pressed]}
            onPress={onAdd}
            accessibilityRole="button"
          >
            <AppText variant="link" color="text.link">
              {`+ ${d.addVehicle}`}
            </AppText>
          </Pressable>
        )}
      </View>
    </BottomSheet>
  );
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    list: { paddingVertical: spacing.sm },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md },
    carTile: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.documents.iconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1 },
    addRow: { justifyContent: 'center' },
    pressed: { opacity: 0.8 },
  });
