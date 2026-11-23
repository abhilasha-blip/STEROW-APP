import React from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Mail from '@/assets/icons/dashboard/mail.svg';
import Person from '@/assets/icons/dashboard/person.svg';
import Phone from '@/assets/icons/dashboard/phone.svg';
import Share from '@/assets/icons/dashboard/share.svg';
import AppText from '@/components/AppText';
import AvatarCircle from '@/components/AvatarCircle';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import type { AvatarId } from '@/constants/avatars';
import { strings } from '@/constants/strings';
import type { HomeStackScreenProps } from '@/navigation/types';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const t = strings.shareAccess;

export type SharedPerson = {
  id: string;
  name: string;
  role: string;
  verified: boolean;
  phone: string;
  email: string;
  avatar: AvatarId | null;
  vehicles: string[];
};

/** TODO(api): vehicle_shares + share invites. Mock people from share-access.svg until then. */
export const MOCK_SHARED_PEOPLE: SharedPerson[] = [
  {
    id: 'p1',
    name: 'Rajesh Kumar',
    role: 'Personal Driver',
    verified: true,
    phone: '+919876543210',
    email: 'rajesh@example.com',
    avatar: null,
    vehicles: ['TS09EV2345', 'TS09AB1234'],
  },
  {
    id: 'p2',
    name: 'Priya Sharma',
    role: 'Family Member',
    verified: true,
    phone: '+919876543211',
    email: 'priya@example.com',
    avatar: 'avatar-05',
    vehicles: ['TS09EV2345', 'TS09AB1234'],
  },
];

/** The green "Verified" shield (share-access.svg), drawn with theme colours. */
export function VerifiedShield({ size = 14, color, checkColor }: { size?: number; color: string; checkColor: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path d="M12 21.5C12 21.5 19.5 18 19.5 12V5.75L12 3L4.5 5.75V12C4.5 18 12 21.5 12 21.5Z" fill={color} />
      <Path d="M8.75 12L11 14.25L15.25 10" stroke={checkColor} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </Svg>
  );
}

/**
 * Share Access (design/dashboard/share-access.svg): person cards (avatar, name, Verified, role, Call /
 * Email, the shared vehicle numbers) + "Share Access". UI only: mock data until the share API is wired.
 */
export default function ShareAccessScreen({ navigation }: HomeStackScreenProps<'ShareAccess'>) {
  return (
    <LightScreen
      testID="share-access"
      title={t.title}
      onBack={() => navigation.goBack()}
      aboveTabs
      footer={<ShareButton onPress={() => navigation.navigate('ComingSoon', { title: t.cta })} />}
    >
      <View style={styles.list}>
        {MOCK_SHARED_PEOPLE.map(p => (
          <PersonCard key={p.id} person={p} />
        ))}
      </View>
    </LightScreen>
  );
}

function ShareButton({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  return (
    <PrimaryButton
      testID="share-access-cta"
      label={t.cta}
      labelVariant="buttonStrong"
      showArrow={false}
      icon={<Share width={22} height={22} color={colors.primary.contrastText} />}
      onPress={onPress}
    />
  );
}

function PersonCard({ person }: { person: SharedPerson }) {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  return (
    <View testID={`person-${person.id}`} style={s.card}>
      <View style={s.top}>
        {person.avatar ? (
          <AvatarCircle avatar={{ type: 'preset', id: person.avatar }} size={48} />
        ) : (
          <View style={s.placeholder}>
            <Person width={24} height={24} color={colors.dashboard.muted} />
          </View>
        )}
        <View style={s.who}>
          <View style={s.nameRow}>
            <AppText variant="cardTitle" color="dashboard.sectionTitle">
              {person.name}
            </AppText>
            {person.verified && (
              <View style={s.verified} accessibilityLabel={t.verified}>
                <VerifiedShield color={colors.dashboard.verified} checkColor={colors.dashboard.verifiedCheck} />
                <AppText variant="tinyStrong" color="dashboard.verified">
                  {t.verified}
                </AppText>
              </View>
            )}
          </View>
          <AppText variant="cardSubtitle" color="dashboard.muted">
            {person.role}
          </AppText>
        </View>
      </View>
      <View style={s.actions}>
        <Pressable
          testID={`person-${person.id}-call`}
          style={({ pressed }) => [s.action, pressed && s.pressed]}
          onPress={() => Linking.openURL(`tel:${person.phone}`)}
          accessibilityRole="button"
          accessibilityLabel={`${t.call} ${person.name}`}
        >
          <Phone width={18} height={18} color={colors.dashboard.muted} />
          <AppText variant="cardTitle" color="dashboard.count">
            {t.call}
          </AppText>
        </Pressable>
        <Pressable
          testID={`person-${person.id}-email`}
          style={({ pressed }) => [s.action, pressed && s.pressed]}
          onPress={() => Linking.openURL(`mailto:${person.email}`)}
          accessibilityRole="button"
          accessibilityLabel={`${t.email} ${person.name}`}
        >
          <Mail width={18} height={18} color={colors.dashboard.muted} />
          <AppText variant="cardTitle" color="dashboard.count">
            {t.email}
          </AppText>
        </Pressable>
      </View>
      <View style={s.divider} />
      <View style={s.chips}>
        {person.vehicles.map(v => (
          <View key={v} style={s.chip}>
            <AppText variant="tinyStrong" color="dashboard.tileTitle">
              {v}
            </AppText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({ list: { gap: 12 } });

/* share-access.svg: card 354×196 (r12), avatar 48, Verified pill (green 16%), Call / Email 157×36 (r8),
   chips 24pt (r12, violet 8% + 40% border). */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    card: { padding: 16, borderRadius: radius.md, backgroundColor: colors.dashboard.card },
    top: { flexDirection: 'row', alignItems: 'center' },
    placeholder: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: colors.dashboard.tile,
      borderWidth: 1,
      borderColor: colors.dashboard.tileBorder,
      alignItems: 'center',
      justifyContent: 'center',
    },
    who: { flex: 1, marginLeft: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    verified: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 20,
      paddingHorizontal: 8,
      borderRadius: 10,
      backgroundColor: colors.dashboard.verifiedBackground,
    },
    actions: { flexDirection: 'row', gap: 8, marginTop: 16 },
    action: {
      flex: 1,
      height: 36,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: radius.sm,
      backgroundColor: colors.dashboard.actionButton,
      borderWidth: 1,
      borderColor: colors.dashboard.tileBorder,
    },
    divider: { height: 1, backgroundColor: colors.dashboard.drawerDivider, marginTop: 16 },
    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16 },
    chip: {
      height: 24,
      paddingHorizontal: 10,
      justifyContent: 'center',
      borderRadius: 12,
      backgroundColor: colors.dashboard.chip,
      borderWidth: 1,
      borderColor: colors.dashboard.chipBorder,
    },
    pressed: { opacity: 0.8 },
  });
