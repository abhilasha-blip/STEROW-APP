import React, { memo, useState } from 'react';
import { FlatList, StyleSheet, View, useWindowDimensions } from 'react-native';
import type { MyVehicle } from '@/api/services/vehicle.service';
import { strings } from '@/constants/strings';
import { useThemedStyles, type Theme } from '@/theme';
import VehicleCard from './VehicleCard';

const t = strings.dashboard;
/** dashboard.svg: cards 340 wide at x 24, the next one peeks in at x 380 (16pt gap). */
const CARD_GAP = 16;
const SIDE = 24;
const PEEK = 38;

export const vehicleName = (v: MyVehicle) => [v.makeName, v.modelName].filter(Boolean).join(' ') || v.vehicleNumber;

/** Horizontal vehicle carousel with page dots (lime 40×6 active, 16×6 grey). */
function VehicleCarousel({ vehicles, onOpen }: { vehicles: MyVehicle[]; onOpen: (v: MyVehicle) => void }) {
  const { width } = useWindowDimensions();
  const styles = useThemedStyles(makeStyles);
  const [index, setIndex] = useState(0);
  const cardWidth = vehicles.length > 1 ? width - SIDE - PEEK : width - SIDE * 2;
  const snap = cardWidth + CARD_GAP;
  return (
    <View testID="vehicle-carousel">
      <FlatList
        horizontal
        data={vehicles}
        keyExtractor={v => v.id}
        showsHorizontalScrollIndicator={false}
        snapToInterval={snap}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: SIDE, gap: CARD_GAP }}
        onMomentumScrollEnd={e => setIndex(Math.round(e.nativeEvent.contentOffset.x / snap))}
        renderItem={({ item }) => (
          <VehicleCard
            testID={`vehicle-card-${item.id}`}
            style={{ width: cardWidth }}
            title={vehicleName(item)}
            subtitle={item.vehicleNumber}
            onPress={() => onOpen(item)}
          />
        )}
      />
      {vehicles.length > 1 && (
        <View style={styles.dots} accessibilityLabel={t.carouselA11y(index + 1, vehicles.length)}>
          {vehicles.map((v, i) => (
            <View key={v.id} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

export default memo(VehicleCarousel);

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginTop: 12 },
    dot: { width: 16, height: 6, borderRadius: 3, backgroundColor: colors.dashboard.dotInactive },
    dotActive: { width: 40, backgroundColor: colors.dashboard.dotActive },
  });
