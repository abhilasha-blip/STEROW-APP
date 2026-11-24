import React, { useEffect, useMemo } from 'react';
import { ActivityIndicator, Image, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import LinkButton from '@/components/LinkButton';
import OutlineButton from '@/components/OutlineButton';
import { strings } from '@/constants/strings';
import { useMyVehicles } from '@/hooks/api/useDocumentsStep';
import type { BookServiceStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/store/auth.store';
import { useBookingStore } from '@/store/booking.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { vehicleName } from '../dashboard/components/VehicleCarousel';
import BookingLayout from './components/BookingLayout';
import SectionHeading from './components/SectionHeading';
import SelectableCard from './components/SelectableCard';
import SelectionIndicator from './components/SelectionIndicator';

const t = strings.bookService.vehicle;
const CAR = require('@/assets/images/dashboard/vehicle-car.jpg');

/**
 * Step 1 – Choose Vehicle (step1.svg): the user's REAL vehicles (useMyVehicles) as cards with the car
 * photo, name, number and a radio. Next is disabled until one is chosen (a single vehicle is preselected).
 */
export default function ChooseVehicleScreen({ navigation }: BookServiceStackScreenProps<'BookVehicle'>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const uid = useAuthStore(s => s.user?.id);
  const vehicles = useMyVehicles(uid);
  const vehicleId = useBookingStore(s => s.vehicleId);
  const setVehicle = useBookingStore(s => s.setVehicle);
  const list = useMemo(() => vehicles.data ?? [], [vehicles.data]);
  const selected = list.some(v => v.id === vehicleId) ? vehicleId : null;

  useEffect(() => {
    if (!selected && list.length === 1) {
      setVehicle(list[0].id);
    }
  }, [selected, list, setVehicle]);

  return (
    <BookingLayout
      testID="book-vehicle"
      step={1}
      onBack={() => navigation.goBack()}
      onPrimary={() => navigation.navigate('BookServices')}
      primaryDisabled={!selected}
      showBackLink={false}
    >
      <SectionHeading title={t.title} subtitle={t.subtitle} />
      <View style={styles.list} accessibilityRole="radiogroup" accessibilityLabel={t.title}>
        {vehicles.isLoading ? (
          <ActivityIndicator testID="book-vehicle-loading" color={colors.input.lightSpinner} style={styles.state} />
        ) : vehicles.isError ? (
          <View testID="book-vehicle-error" style={styles.state}>
            <AppText variant="body" color="booking.subtitle">
              {t.error}
            </AppText>
            <LinkButton label={t.retry} onPress={() => vehicles.refetch()} />
          </View>
        ) : list.length === 0 ? (
          <View testID="book-vehicle-empty" style={styles.state}>
            <AppText variant="sectionTitleSmall" color="booking.text">
              {t.emptyTitle}
            </AppText>
            <AppText variant="body" color="booking.subtitle" style={styles.emptyBody}>
              {t.emptyBody}
            </AppText>
            <OutlineButton
              testID="book-vehicle-add"
              label={t.addVehicle}
              onPress={() => navigation.navigate('AddVehicle')}
              style={styles.add}
            />
          </View>
        ) : (
          list.map(v => {
            const name = vehicleName(v);
            const isSelected = v.id === selected;
            return (
              <SelectableCard
                key={v.id}
                testID={`book-vehicle-${v.id}`}
                role="radio"
                selected={isSelected}
                onPress={() => setVehicle(v.id)}
                accessibilityLabel={`${name}, ${v.vehicleNumber}`}
                style={styles.card}
              >
                <View style={styles.imageBox}>
                  <Image source={CAR} style={styles.image} resizeMode="cover" />
                </View>
                <View style={styles.text}>
                  <AppText variant="cardTitle" color="booking.title" numberOfLines={1}>
                    {name}
                  </AppText>
                  <AppText variant="rowSubtitle" color="booking.meta" numberOfLines={1} style={styles.number}>
                    {v.vehicleNumber}
                  </AppText>
                </View>
                <SelectionIndicator kind="radio" selected={isSelected} testID={`book-vehicle-${v.id}-radio`} />
              </SelectableCard>
            );
          })
        )}
      </View>
    </BookingLayout>
  );
}

/* step1.svg: cards 354×94 (r12) 8pt apart, 16pt under the subtitle; photo 96×64 (r12) 17pt in; text 12pt
 * after it; radio 17pt from the right edge. */
const makeStyles = ({ radius }: Theme) =>
  StyleSheet.create({
    list: { marginTop: 20, gap: 8 },
    card: { flexDirection: 'row', alignItems: 'center', minHeight: 94, paddingLeft: 16, paddingRight: 16 },
    imageBox: { width: 96, height: 64, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    image: { width: 124, height: 124 },
    text: { flex: 1, marginLeft: 12, marginRight: 8 },
    number: { marginTop: 6 },
    state: { marginTop: 24, alignItems: 'center' },
    emptyBody: { marginTop: 6, textAlign: 'center' },
    add: { marginTop: 20, alignSelf: 'stretch' },
  });
