import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import ArrowRight from '@/assets/icons/arrow-right.svg';
import Bag from '@/assets/icons/dashboard/bag.svg';
import Carpool from '@/assets/icons/dashboard/carpool.svg';
import Driver from '@/assets/icons/dashboard/driver.svg';
import Store from '@/assets/icons/dashboard/store.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const t = strings.dashboard.quickLinks;

export type QuickLinkKey = 'carpool' | 'buySell' | 'accessories' | 'driverCommunity';
const LINKS: { key: QuickLinkKey; icon: React.FC<SvgProps>; disabled?: boolean }[] = [
  // Disabled style in the design (feature not available yet).
  { key: 'carpool', icon: Carpool, disabled: true },
  { key: 'buySell', icon: Store },
  { key: 'accessories', icon: Bag },
  { key: 'driverCommunity', icon: Driver },
];

/** dashboard.svg "Quick Links" (brown 20) + "View all →", four 82.5×86 white cards (r16, soft shadow). */
function QuickLinks({ onOpen, onViewAll }: { onOpen: (key: QuickLinkKey) => void; onViewAll: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View>
      <View style={styles.header}>
        <AppText variant="sectionTitle" color="dashboard.sectionTitle" accessibilityRole="header">
          {t.title}
        </AppText>
        <Pressable testID="quick-links-all" onPress={onViewAll} hitSlop={8} accessibilityRole="button" style={styles.viewAll}>
          <AppText variant="cardTitle" color="dashboard.count">
            {t.viewAll}
          </AppText>
          <ArrowRight width={14} height={12} color={colors.dashboard.count} />
        </Pressable>
      </View>
      <View style={styles.row}>
        {LINKS.map(({ key, icon: Icon, disabled }) => (
          <Pressable
            key={key}
            testID={`quick-link-${key}`}
            disabled={disabled}
            onPress={() => onOpen(key)}
            accessibilityRole="button"
            accessibilityState={{ disabled: !!disabled }}
            accessibilityLabel={t[key].replace('\n', ' ')}
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
          >
            <Icon width={24} height={24} color={disabled ? colors.dashboard.disabledText : colors.dashboard.tileIcon} />
            <AppText
              variant="tiny"
              color={disabled ? 'dashboard.disabledText' : 'dashboard.tileTitle'}
              style={styles.label}
              numberOfLines={2}
            >
              {t[key]}
            </AppText>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default memo(QuickLinks);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    viewAll: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    row: { flexDirection: 'row', gap: 8, marginTop: 20 },
    card: {
      flex: 1,
      height: 86,
      borderRadius: radius.lg,
      backgroundColor: colors.dashboard.quickLink,
      alignItems: 'center',
      paddingTop: 20,
      shadowColor: colors.surface.shadow,
      shadowOpacity: 0.04,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 2,
    },
    label: { marginTop: 8, textAlign: 'center' },
    pressed: { opacity: 0.85 },
  });
