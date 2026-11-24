import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BottomSheet from '@/components/BottomSheet';
import ChipGroup from '@/components/ChipGroup';
import LinkButton from '@/components/LinkButton';
import PrimaryButton from '@/components/PrimaryButton';
import { strings } from '@/constants/strings';
import type { CentreBadge } from '@/services/bookingService';
import SelectionIndicator from './SelectionIndicator';

const t = strings.bookService.centre;

export type CentreFilters = {
  /** null = any distance. */
  maxKm: number | null;
  minRating: number | null;
  /** Empty = every type. */
  types: CentreBadge[];
};

export const NO_FILTERS: CentreFilters = { maxKm: null, minRating: null, types: [] };

const DISTANCES = [5, 10, 20] as const;
const RATINGS = [4, 4.5] as const;
const TYPES: CentreBadge[] = ['authorised', 'certified', 'multiBrand'];

export const filtersActive = (f: CentreFilters) => f.maxKm !== null || f.minRating !== null || f.types.length > 0;

type Props = {
  visible: boolean;
  value: CentreFilters;
  onApply: (filters: CentreFilters) => void;
  onClose: () => void;
};

/** Step 3 filter (no Figma): distance, minimum rating and centre type; Apply / Reset. Edits a draft until Apply. */
export default function CentreFilterSheet({ visible, value, onApply, onClose }: Props) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  const distanceOptions = [
    { value: 'any', label: t.filter.anyDistance },
    ...DISTANCES.map(km => ({ value: String(km), label: t.filter.within(km) })),
  ];
  const ratingOptions = [
    { value: 'any', label: t.filter.anyRating },
    ...RATINGS.map(r => ({ value: String(r), label: t.filter.ratingAtLeast(r) })),
  ];
  const toggleType = (type: CentreBadge) =>
    setDraft(d => ({ ...d, types: d.types.includes(type) ? d.types.filter(x => x !== type) : [...d.types, type] }));

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.filter.title} testID="centre-filter">
      <ChipGroup
        testID="filter-distance"
        label={t.filter.distance}
        options={distanceOptions}
        value={draft.maxKm === null ? 'any' : String(draft.maxKm)}
        onChange={v => setDraft(d => ({ ...d, maxKm: v === 'any' ? null : Number(v) }))}
        style={styles.group}
      />
      <ChipGroup
        testID="filter-rating"
        label={t.filter.rating}
        options={ratingOptions}
        value={draft.minRating === null ? 'any' : String(draft.minRating)}
        onChange={v => setDraft(d => ({ ...d, minRating: v === 'any' ? null : Number(v) }))}
        style={styles.group}
      />
      <AppText variant="fieldLabel" color="text.onLight" style={styles.group}>
        {t.filter.type}
      </AppText>
      <View style={styles.types}>
        {TYPES.map(type => {
          const checked = draft.types.includes(type);
          return (
            <Pressable
              key={type}
              testID={`filter-type-${type}`}
              onPress={() => toggleType(type)}
              accessibilityRole="checkbox"
              accessibilityLabel={t.badges[type]}
              accessibilityState={{ checked }}
              style={styles.typeRow}
            >
              <SelectionIndicator kind="checkbox" selected={checked} />
              <AppText variant="body" color="booking.text" style={styles.typeLabel}>
                {t.badges[type]}
              </AppText>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.actions}>
        <LinkButton testID="filter-reset" label={t.filter.reset} onPress={() => setDraft(NO_FILTERS)} />
        <PrimaryButton
          testID="filter-apply"
          label={t.filter.apply}
          labelVariant="buttonStrong"
          showArrow={false}
          onPress={() => {
            onApply(draft);
            onClose();
          }}
          style={styles.apply}
        />
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  group: { marginTop: 16 },
  types: { marginTop: 4 },
  typeRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  typeLabel: { marginLeft: 12 },
  actions: { flexDirection: 'row', alignItems: 'center', marginTop: 16, marginBottom: 8 },
  apply: { flex: 1, marginLeft: 16 },
});
