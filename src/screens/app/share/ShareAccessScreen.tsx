import React from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Person from '@/assets/icons/dashboard/person.svg';
import Phone from '@/assets/icons/dashboard/phone.svg';
import Share from '@/assets/icons/dashboard/share.svg';
import AppText from '@/components/AppText';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { toUserError } from '@/api/errorMessages';
import type { SharedPerson } from '@/api/services/shareAccess.service';
import { strings } from '@/constants/strings';
import { useMyVehicles } from '@/hooks/api/useDocumentsStep';
import { useSharedPeople } from '@/hooks/api/useShareAccess';
import type { HomeStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/store/auth.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const t = strings.shareAccess;

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
 * Share Access (design/dashboard/share-access.svg): one card per person the signed-in user shares their
 * vehicles with (vehicle_shares, owner_id = uid): name, Verified, role, Call, the shared vehicle
 * numbers; "Share Access" at the bottom. No shares → an empty state.
 */
export default function ShareAccessScreen({ navigation }: HomeStackScreenProps<'ShareAccess'>) {
  const { colors } = useTheme();
  const uid = useAuthStore(s => s.user?.id);
  const people = useSharedPeople(uid);
  const vehicles = useMyVehicles(uid);
  const numberOf = (id: string) => vehicles.data?.find(v => v.id === id)?.vehicleNumber;
  return (
    <LightScreen
      testID="share-access"
      title={t.title}
      onBack={() => navigation.goBack()}
      aboveTabs
      footer={<ShareButton onPress={() => navigation.navigate('ComingSoon', { title: t.cta })} />}
    >
      {people.isLoading ? (
        <ActivityIndicator testID="share-access-loading" color={colors.input.lightSpinner} />
      ) : people.isError ? (
        <AppText testID="share-access-error" variant="body" color="text.onLightMuted">
          {toUserError(people.error).userMessage}
        </AppText>
      ) : people.data?.length ? (
        <View style={styles.list}>
          {people.data.map(p => (
            <PersonCard
              key={p.id}
              person={p}
              vehicleNumbers={p.vehicleIds.map(numberOf).filter((n): n is string => !!n)}
            />
          ))}
        </View>
      ) : (
        <View testID="share-access-empty" style={styles.empty}>
          <AppText variant="cardTitle" color="dashboard.sectionTitle">
            {t.emptyTitle}
          </AppText>
          <AppText variant="body" color="text.onLightMuted" style={styles.emptyBody}>
            {t.emptyBody}
          </AppText>
        </View>
      )}
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

function PersonCard({ person, vehicleNumbers }: { person: SharedPerson; vehicleNumbers: string[] }) {
  const { colors } = useTheme();
  const s = useThemedStyles(makeStyles);
  const name = person.name || person.phone || t.unnamed;
  return (
    <View testID={`person-${person.id}`} style={s.card}>
      <View style={s.top}>
        <View style={s.placeholder}>
          <Person width={24} height={24} color={colors.dashboard.muted} />
        </View>
        <View style={s.who}>
          <View style={s.nameRow}>
            <AppText variant="cardTitle" color="dashboard.sectionTitle">
              {name}
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
          {person.role && (
            <AppText variant="cardSubtitle" color="dashboard.muted">
              {t.roles[person.role]}
            </AppText>
          )}
        </View>
      </View>
      {person.phone && (
        <View style={s.actions}>
          <Pressable
            testID={`person-${person.id}-call`}
            style={({ pressed }) => [s.action, pressed && s.pressed]}
            onPress={() => Linking.openURL(`tel:${person.phone}`)}
            accessibilityRole="button"
            accessibilityLabel={`${t.call} ${name}`}
          >
            <Phone width={18} height={18} color={colors.dashboard.muted} />
            <AppText variant="cardTitle" color="dashboard.count">
              {t.call}
            </AppText>
          </Pressable>
        </View>
      )}
      {vehicleNumbers.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.chips}>
            {vehicleNumbers.map(v => (
              <View key={v} style={s.chip}>
                <AppText variant="tinyStrong" color="dashboard.tileTitle">
                  {v}
                </AppText>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  list: { gap: 12 },
  empty: { alignItems: 'center', paddingVertical: 32 },
  emptyBody: { marginTop: 8, textAlign: 'center' },
});

/* share-access.svg: card 354×196 (r12), avatar 48, Verified pill (green 16%), Call / Email 157×36 (r8; Email
   is not shown: vehicle_shares has no e-mail column),
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
