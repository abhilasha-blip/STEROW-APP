import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Filter from '@/assets/icons/book-service/filter.svg';
import Search from '@/assets/icons/book-service/search.svg';
import AppText from '@/components/AppText';
import LinkButton from '@/components/LinkButton';
import TextField from '@/components/TextField';
import { strings } from '@/constants/strings';
import { useServiceCentres } from '@/hooks/api/useBookService';
import type { BookServiceStackScreenProps } from '@/navigation/types';
import type { ServiceCentre } from '@/services/bookingService';
import { useBookingStore } from '@/store/booking.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import BookingLayout from './components/BookingLayout';
import CentreCard from './components/CentreCard';
import CentreFilterSheet, { NO_FILTERS, filtersActive, type CentreFilters } from './components/CentreFilterSheet';
import SectionHeading from './components/SectionHeading';

const t = strings.bookService.centre;

export type CentreSort = 'best' | 'nearest' | 'rating';
const SORTS: CentreSort[] = ['best', 'nearest', 'rating'];

/** Search (name / address), filters, then sort. "Best match" keeps the service's order. */
export function visibleCentres(all: ServiceCentre[], query: string, filters: CentreFilters, sort: CentreSort): ServiceCentre[] {
  const q = query.trim().toLowerCase();
  const list = all.filter(
    c =>
      (!q || c.name.toLowerCase().includes(q) || c.address.toLowerCase().includes(q)) &&
      (filters.maxKm === null || c.distanceKm <= filters.maxKm) &&
      (filters.minRating === null || c.rating >= filters.minRating) &&
      (filters.types.length === 0 || c.badges.some(b => filters.types.includes(b))),
  );
  if (sort === 'nearest') {
    return [...list].sort((a, b) => a.distanceKm - b.distanceKm);
  }
  if (sort === 'rating') {
    return [...list].sort((a, b) => b.rating - a.rating || b.ratingCount - a.ratingCount);
  }
  return list;
}

/**
 * Step 3 – Choose Service Center (step3.svg): search, "Found (n)" + filter (bottom sheet), Best match /
 * Nearest / Top rated chips (single select, sorts), centre cards with a radio. Next needs a visible choice.
 */
export default function ChooseCentreScreen({ navigation }: BookServiceStackScreenProps<'BookCentre'>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const centres = useServiceCentres();
  const centreId = useBookingStore(s => s.centreId);
  const setCentre = useBookingStore(s => s.setCentre);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<CentreSort>('best');
  const [filters, setFilters] = useState<CentreFilters>(NO_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const list = useMemo(() => visibleCentres(centres.data ?? [], query, filters, sort), [centres.data, query, filters, sort]);
  const chosenVisible = list.some(c => c.id === centreId);

  return (
    <BookingLayout
      testID="book-centre"
      step={3}
      onBack={() => navigation.goBack()}
      onPrimary={() => navigation.navigate('BookSlot')}
      primaryDisabled={!chosenVisible}
    >
      <SectionHeading title={t.title} subtitle={t.subtitle} />
      <TextField
        testID="centre-search"
        variant="light"
        label={t.searchA11y}
        labelHidden
        value={query}
        onChangeText={setQuery}
        placeholder={t.searchPlaceholder}
        leftIcon={<Search width={24} height={24} color={colors.booking.muted} />}
        autoCorrect={false}
        returnKeyType="search"
        style={styles.search}
      />

      <View style={styles.panel}>
        <View style={styles.foundRow}>
          <AppText testID="centre-found" variant="sectionTitleSmall" color="booking.title" style={styles.found}>
            {t.found(centres.isLoading ? 0 : list.length)}
          </AppText>
          <Pressable
            testID="centre-filter-open"
            onPress={() => setFilterOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={t.filterA11y}
            accessibilityState={{ selected: filtersActive(filters) }}
            hitSlop={4}
            style={({ pressed }) => [styles.filter, pressed && styles.pressed]}
          >
            <Filter width={24} height={24} color={colors.booking.languageIcon} />
            {filtersActive(filters) && <View testID="centre-filter-dot" style={styles.dot} />}
          </Pressable>
        </View>

        <View style={styles.chips} accessibilityRole="radiogroup" accessibilityLabel={t.sortA11y}>
          {SORTS.map(key => {
            const active = key === sort;
            return (
              <Pressable
                key={key}
                testID={`centre-sort-${key}`}
                onPress={() => setSort(key)}
                accessibilityRole="radio"
                accessibilityLabel={t.sort[key]}
                accessibilityState={{ checked: active }}
                style={[styles.chip, active && styles.chipActive]}
              >
                <AppText variant="chip" color={active ? 'booking.sortChipActiveText' : 'booking.sortChipText'}>
                  {t.sort[key]}
                </AppText>
              </Pressable>
            );
          })}
        </View>

        {centres.isLoading ? (
          <ActivityIndicator testID="centre-loading" color={colors.input.lightSpinner} style={styles.state} />
        ) : list.length === 0 ? (
          <View testID="centre-empty" style={styles.state}>
            <AppText variant="sectionTitleSmall" color="booking.text">
              {t.emptyTitle}
            </AppText>
            <AppText variant="body" color="booking.subtitle" style={styles.emptyBody}>
              {t.emptyBody}
            </AppText>
            <LinkButton
              testID="centre-clear"
              label={t.clearFilters}
              onPress={() => {
                setQuery('');
                setFilters(NO_FILTERS);
              }}
            />
          </View>
        ) : (
          <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t.title}>
            {list.map(c => (
              <CentreCard key={c.id} centre={c} selected={c.id === centreId} onSelect={setCentre} />
            ))}
          </View>
        )}
      </View>

      <CentreFilterSheet visible={filterOpen} value={filters} onApply={setFilters} onClose={() => setFilterOpen(false)} />
    </BookingLayout>
  );
}

/* step3.svg: search 48pt (r8, mist100) 20pt under the subtitle; white panel r12 24pt below, 16pt padding;
 * filter 40pt circle (black 4%); chips 32pt (r16) 28pt under "Found"; cards 8pt apart, 28pt under chips. */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    search: { marginTop: 20 },
    panel: { marginTop: 24, padding: 16, borderRadius: radius.md, backgroundColor: colors.booking.card },
    foundRow: { flexDirection: 'row', alignItems: 'center' },
    found: { flex: 1 },
    filter: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.booking.filterButton,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      position: 'absolute',
      top: 8,
      right: 8,
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.booking.link,
    },
    pressed: { opacity: 0.8 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 28 },
    chip: {
      height: 32,
      paddingHorizontal: 16,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.booking.sortChipBorder,
      backgroundColor: colors.booking.sortChip,
      justifyContent: 'center',
    },
    chipActive: { backgroundColor: colors.booking.sortChipActive, borderColor: colors.booking.sortChipActive },
    list: { marginTop: 28, gap: 8 },
    state: { marginVertical: 32, alignItems: 'center' },
    emptyBody: { marginTop: 6, textAlign: 'center' },
  });
