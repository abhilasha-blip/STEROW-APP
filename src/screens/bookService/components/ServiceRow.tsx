import React, { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import Ac from '@/assets/icons/book-service/service-ac.svg';
import Battery from '@/assets/icons/book-service/service-battery.svg';
import BrakePads from '@/assets/icons/book-service/service-brake-pads.svg';
import Bumper from '@/assets/icons/book-service/service-bumper.svg';
import Engine from '@/assets/icons/book-service/service-engine.svg';
import Gear from '@/assets/icons/book-service/service-gear.svg';
import Headlight from '@/assets/icons/book-service/service-headlight.svg';
import Tyre from '@/assets/icons/book-service/service-tyre.svg';
import AppText from '@/components/AppText';
import type { ServiceIconKey, ServiceItem } from '@/services/bookingService';
import { useTheme } from '@/theme';
import SelectableCard from './SelectableCard';
import SelectionIndicator from './SelectionIndicator';

const ICONS: Record<ServiceIconKey, React.FC<SvgProps>> = {
  headlight: Headlight,
  brakePads: BrakePads,
  gear: Gear,
  bumper: Bumper,
  battery: Battery,
  ac: Ac,
  engine: Engine,
  tyre: Tyre,
};

type Props = { item: ServiceItem; selected: boolean; onToggle: (id: string) => void };

/** step2.svg service row: 322×64 r8, 24pt slate icon 13pt in, title + subtitle 9pt after it, checkbox 13pt from the right. */
function ServiceRow({ item, selected, onToggle }: Props) {
  const { colors } = useTheme();
  const Icon = ICONS[item.icon];
  return (
    <SelectableCard
      testID={`service-${item.id}`}
      role="checkbox"
      radius={8}
      selected={selected}
      onPress={() => onToggle(item.id)}
      accessibilityLabel={`${item.title}, ${item.subtitle}`}
      style={styles.row}
    >
      <Icon width={24} height={24} color={colors.booking.rowIcon} />
      <View style={styles.text}>
        <AppText variant="rowTitle" color="booking.text" numberOfLines={1}>
          {item.title}
        </AppText>
        <AppText variant="rowSubtitle" color="booking.meta" numberOfLines={1} style={styles.subtitle}>
          {item.subtitle}
        </AppText>
      </View>
      <SelectionIndicator kind="checkbox" selected={selected} testID={`service-${item.id}-check`} />
    </SelectableCard>
  );
}

export default memo(ServiceRow);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 64, paddingLeft: 12, paddingRight: 12 },
  text: { flex: 1, marginLeft: 9, marginRight: 8 },
  subtitle: { marginTop: 3 },
});
