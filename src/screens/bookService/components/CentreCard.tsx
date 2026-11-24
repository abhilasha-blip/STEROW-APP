import React, { memo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import Certified from '@/assets/icons/book-service/certified.svg';
import Distance from '@/assets/icons/book-service/distance.svg';
import MultiBrand from '@/assets/icons/book-service/multi-brand.svg';
import PinSmall from '@/assets/icons/book-service/pin-small.svg';
import ShieldCheck from '@/assets/icons/book-service/shield-check.svg';
import Star from '@/assets/icons/book-service/star.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import type { CentreBadge, ServiceCentre } from '@/services/bookingService';
import { useTheme, useThemedStyles, type ColorToken, type Theme } from '@/theme';
import SelectableCard from './SelectableCard';
import SelectionIndicator from './SelectionIndicator';

const t = strings.bookService.centre;

type PillTone = 'authorised' | 'certified' | 'multiBrand' | 'rating' | 'distance';

const BADGE_ICON: Record<CentreBadge, React.FC<SvgProps>> = {
  authorised: ShieldCheck,
  certified: Certified,
  multiBrand: MultiBrand,
};

/** Per tone: the pill fill, the label colour token and the icon colour (all from colors.booking). */
const TONES: Record<PillTone, { fill: keyof Theme['colors']['booking']; text: ColorToken; icon: keyof Theme['colors']['booking'] }> = {
  authorised: { fill: 'badgeAuthorised', text: 'booking.badgeAuthorisedText', icon: 'badgeAuthorisedText' },
  certified: { fill: 'badgeCertified', text: 'booking.badgeCertifiedText', icon: 'badgeCertifiedText' },
  multiBrand: { fill: 'badgeMultiBrand', text: 'booking.badgeMultiBrandText', icon: 'badgeMultiBrandText' },
  rating: { fill: 'badgeRating', text: 'booking.badgeRatingText', icon: 'star' },
  distance: { fill: 'badgeDistance', text: 'booking.badgeDistanceText', icon: 'badgeDistanceText' },
};

function Pill({ tone, icon: Icon, label, a11y }: { tone: PillTone; icon: React.FC<SvgProps>; label: string; a11y?: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const c = TONES[tone];
  return (
    <View
      testID={`pill-${tone}`}
      style={[styles.pill, { backgroundColor: colors.booking[c.fill] }]}
      accessible
      accessibilityLabel={a11y ?? label}
    >
      <Icon width={12} height={12} color={colors.booking[c.icon]} />
      <AppText variant="badge" color={c.text} style={styles.pillLabel}>
        {label}
      </AppText>
    </View>
  );
}

type Props = { centre: ServiceCentre; selected: boolean; onSelect: (id: string) => void };

/**
 * step3.svg centre card: 322pt r8; 48pt round logo 13pt in (black 4% ring); name SemiBold, address with a
 * pin; then 20pt pills 4pt apart (type badges, rating with an orange star, distance); radio top-right.
 */
function CentreCard({ centre, selected, onSelect }: Props) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <SelectableCard
      testID={`centre-${centre.id}`}
      role="radio"
      radius={8}
      selected={selected}
      onPress={() => onSelect(centre.id)}
      accessibilityLabel={`${centre.name}, ${centre.address}, ${t.ratingA11y(centre.rating, centre.ratingCount)}, ${t.distance(centre.distanceKm)}`}
      style={styles.card}
    >
      <Image source={centre.logo} style={styles.logo} accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <AppText variant="rowTitle" color="booking.text" style={styles.name} numberOfLines={2}>
            {centre.name}
          </AppText>
          <SelectionIndicator kind="radio" selected={selected} />
        </View>
        <View style={styles.addressRow}>
          <PinSmall width={14} height={14} color={colors.booking.muted} />
          <AppText variant="meta" color="booking.meta" style={styles.address} numberOfLines={2}>
            {centre.address}
          </AppText>
        </View>
        <View style={styles.pills}>
          {centre.badges.map(b => (
            <Pill key={b} tone={b} icon={BADGE_ICON[b]} label={t.badges[b]} />
          ))}
          <Pill
            tone="rating"
            icon={Star}
            label={t.rating(centre.rating, centre.ratingCount)}
            a11y={t.ratingA11y(centre.rating, centre.ratingCount)}
          />
          <Pill tone="distance" icon={Distance} label={t.distance(centre.distanceKm)} />
        </View>
      </View>
    </SelectableCard>
  );
}

export default memo(CentreCard);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    card: { flexDirection: 'row', padding: 12, minHeight: 118 },
    logo: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, borderColor: colors.booking.logoBorder },
    body: { flex: 1, marginLeft: 8 },
    titleRow: { flexDirection: 'row', alignItems: 'flex-start' },
    name: { flex: 1, marginRight: 8 },
    addressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    address: { flex: 1, marginLeft: 2 },
    pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 8 },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 20,
      paddingHorizontal: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.booking.pillBorder,
    },
    pillLabel: { marginLeft: 4 },
  });
