import React, { useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import ChevronDown from '@/assets/icons/chevron-down.svg';
import Car from '@/assets/icons/dashboard/car.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import VehiclePickerSheet from './VehiclePickerSheet';

const d = strings.onboarding.documents;

export type VehicleOption = { id: string; vehicleNumber: string; name: string };

/** "TS09AB1234 (Hyundai Creta)". */
export const vehicleLabel = (v: VehicleOption) => (v.name ? `${v.vehicleNumber} (${v.name})` : v.vehicleNumber);

export type VehicleSelectCardProps = {
  vehicles: readonly VehicleOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** "Add new vehicle" (the sheet closes first, then this runs). */
  onAddVehicle: () => void;
  loading?: boolean;
  /** Card title; omit to render the selector alone (e.g. inside another card). */
  label?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * "Vehicle" card (vehicle-documents-step.jpeg): car tile + "<number> (<make model>)" + chevron → a sheet
 * with the user's vehicles and "Add new vehicle".
 */
export default function VehicleSelectCard({
  vehicles,
  selectedId,
  onSelect,
  onAddVehicle,
  loading = false,
  label = d.vehicleLabel,
  testID = 'vehicle-select',
  style,
}: VehicleSelectCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState(false);
  const addAfterClose = useRef(false);
  const selected = vehicles.find(v => v.id === selectedId);

  return (
    <View style={[styles.card, style]}>
      {!!label && (
        <AppText variant="sectionTitleSmall" color="text.onLight" style={styles.label}>
          {label}
        </AppText>
      )}
      <Pressable
        testID={testID}
        style={({ pressed }) => [styles.selector, pressed && styles.pressed]}
        onPress={() => (vehicles.length ? setOpen(true) : onAddVehicle())}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel={d.vehicleA11y(selected ? vehicleLabel(selected) : d.vehiclePlaceholder)}
      >
        <View style={styles.carTile}>
          <Car width={20} height={20} color={colors.documents.icon} />
        </View>
        <AppText variant="cardTitle" color="text.onLight" numberOfLines={1} style={styles.value}>
          {selected ? selected.vehicleNumber : d.vehiclePlaceholder}
          {!!selected?.name && (
            <AppText variant="cardSubtitle" color="text.onLightMuted">
              {` (${selected.name})`}
            </AppText>
          )}
        </AppText>
        {loading ? (
          <ActivityIndicator color={colors.input.lightSpinner} />
        ) : (
          <ChevronDown width={20} height={20} color={colors.text.onLight} />
        )}
      </Pressable>

      <VehiclePickerSheet
        testID={`${testID}-sheet`}
        optionTestIDPrefix={testID}
        visible={open}
        vehicles={vehicles}
        selectedId={selectedId}
        onSelect={id => {
          onSelect(id);
          setOpen(false);
        }}
        onAdd={() => {
          addAfterClose.current = true;
          setOpen(false);
        }}
        onClose={() => setOpen(false)}
        onClosed={() => {
          if (addAfterClose.current) {
            addAfterClose.current = false;
            onAddVehicle();
          }
        }}
      />
    </View>
  );
}

/* vehicle-documents-step.jpeg: white card, "Vehicle" label, a 40pt selector with a violet border. */
const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: colors.documents.card, borderRadius: radius.sheet, padding: spacing.lg },
    label: { marginBottom: spacing.sm },
    selector: {
      minHeight: 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing.md,
      paddingLeft: spacing.md,
      paddingRight: spacing.lg,
      paddingVertical: 6,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.documents.selectorBorder,
    },
    carTile: {
      width: 32,
      height: 32,
      borderRadius: radius.sm,
      backgroundColor: colors.documents.iconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    value: { flex: 1 },
    pressed: { opacity: 0.8 },
  });
