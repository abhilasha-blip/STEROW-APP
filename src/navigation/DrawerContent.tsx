import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import Car from '@/assets/icons/dashboard/car.svg';
import ChevronRight from '@/assets/icons/dashboard/chevron-right.svg';
import Close from '@/assets/icons/dashboard/close.svg';
import Faq from '@/assets/icons/dashboard/faq.svg';
import Feedback from '@/assets/icons/dashboard/feedback.svg';
import FindVehicle from '@/assets/icons/dashboard/find-vehicle.svg';
import Folder from '@/assets/icons/dashboard/folder.svg';
import Gift from '@/assets/icons/dashboard/gift.svg';
import Headset from '@/assets/icons/dashboard/headset.svg';
import Language from '@/assets/icons/dashboard/language.svg';
import Logout from '@/assets/icons/dashboard/logout.svg';
import Person from '@/assets/icons/dashboard/person.svg';
import Refer from '@/assets/icons/dashboard/refer.svg';
import ShareAccess from '@/assets/icons/dashboard/share-access.svg';
import Wrench from '@/assets/icons/dashboard/wrench.svg';
import AppText from '@/components/AppText';
import AvatarCircle from '@/components/AvatarCircle';
import { DEFAULT_AVATAR_ID } from '@/constants/avatars';
import { strings } from '@/constants/strings';
import { useDashboard } from '@/hooks/api/useDashboard';
import { useAuthStore } from '@/store/auth.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import type { HomeStackParamList } from './types';

const t = strings.drawer;

type Row = {
  key: string;
  label: string;
  icon: React.FC<SvgProps>;
  /** A built Home-stack screen; otherwise "Coming soon". */
  screen?: Exclude<keyof HomeStackParamList, 'ComingSoon' | 'UploadDocuments' | 'BookingSuccess'>;
};

/** side-drawer.svg rows, in order. */
export const DRAWER_ROWS: Row[] = [
  { key: 'profile', label: t.myProfile, icon: Person, screen: 'MyProfile' },
  { key: 'vehicles', label: t.myVehicles, icon: Car, screen: 'MyVehicles' },
  { key: 'documents', label: t.myDocuments, icon: Folder, screen: 'MyDocuments' },
  { key: 'services', label: t.myServices, icon: Wrench, screen: 'BookService' },
  { key: 'share', label: t.shareAccess, icon: ShareAccess, screen: 'ShareAccess' },
  { key: 'find', label: t.findMyVehicles, icon: FindVehicle },
  { key: 'rewards', label: t.myRewards, icon: Gift },
  { key: 'refer', label: t.referFriend, icon: Refer },
  { key: 'feedback', label: t.feedback, icon: Feedback },
  { key: 'faqs', label: t.faqs, icon: Faq },
  { key: 'help', label: t.help, icon: Headset },
  { key: 'language', label: t.changeLanguage, icon: Language },
];

/**
 * Side drawer (design/dashboard/side-drawer.svg): close X, avatar + name + email, the menu rows with
 * icons and chevrons, a divider and Logout (the existing signOut).
 */
export default function DrawerContent({ navigation }: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const signOut = useAuthStore(s => s.signOut);
  const data = useDashboard();

  const open = (row: Row) => {
    navigation.closeDrawer();
    navigation.navigate('Tabs', {
      screen: 'HomeTab',
      params: row.screen ? { screen: row.screen } : { screen: 'ComingSoon', params: { title: row.label } },
    });
  };

  return (
    <View testID="drawer" style={[styles.root, { paddingTop: insets.top + 8 }]}>
      <Pressable
        testID="drawer-close"
        onPress={() => navigation.closeDrawer()}
        accessibilityRole="button"
        accessibilityLabel={t.closeA11y}
        hitSlop={8}
        style={styles.close}
      >
        <Close width={18} height={18} color={colors.dashboard.tileIcon} />
      </Pressable>

      <View style={styles.profile}>
        <AvatarCircle
          testID="drawer-avatar"
          avatar={data.avatarUrl ? { type: 'photo', uri: data.avatarUrl } : { type: 'preset', id: DEFAULT_AVATAR_ID }}
          size={76}
        />
        <View style={styles.profileText}>
          <AppText testID="drawer-name" variant="drawerName" color="dashboard.tileTitle" numberOfLines={1}>
            {data.fullName}
          </AppText>
          {!!data.email && (
            <AppText testID="drawer-email" variant="cardSubtitle" color="dashboard.muted" numberOfLines={1}>
              {data.email}
            </AppText>
          )}
        </View>
      </View>

      <ScrollView style={styles.rows} showsVerticalScrollIndicator={false}>
        {DRAWER_ROWS.map(row => {
          const Icon = row.icon;
          return (
            <Pressable
              key={row.key}
              testID={`drawer-${row.key}`}
              onPress={() => open(row)}
              accessibilityRole="button"
              accessibilityLabel={row.label}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}
            >
              <Icon width={24} height={24} color={colors.dashboard.drawerRowIcon} />
              <AppText variant="drawerRow" color="dashboard.drawerRowText" style={styles.label}>
                {row.label}
              </AppText>
              <ChevronRight width={20} height={20} color={colors.dashboard.drawerRowIcon} />
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.divider} />
        <Pressable
          testID="drawer-logout"
          onPress={() => {
            navigation.closeDrawer();
            signOut();
          }}
          accessibilityRole="button"
          accessibilityLabel={t.logout}
          style={({ pressed }) => [styles.row, pressed && styles.pressed]}
        >
          <Logout width={24} height={24} color={colors.dashboard.drawerLogout} />
          <AppText variant="drawerRow" color="dashboard.drawerLogout" style={styles.label}>
            {t.logout}
          </AppText>
        </Pressable>
      </View>
    </View>
  );
}

/* side-drawer.svg @2x: close circle at 23,23 (31pt); avatar 76 at x 23; rows 57.7pt apart, icon x 38,
   label x 74, chevron ending 28pt from the 308pt edge; divider above Logout. */
const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.dashboard.drawer },
    close: {
      marginLeft: 23,
      width: 31,
      height: 31,
      borderRadius: 15.5,
      backgroundColor: colors.surface.iconButtonLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    profile: { flexDirection: 'row', alignItems: 'center', marginTop: 23, marginLeft: 23, marginRight: 20 },
    profileText: { flex: 1, marginLeft: 17 },
    rows: { flex: 1, marginTop: 16 },
    row: { flexDirection: 'row', alignItems: 'center', height: 57.7, paddingLeft: 38, paddingRight: 28 },
    label: { flex: 1, marginLeft: 12 },
    footer: {},
    divider: { height: 1, marginHorizontal: 23, backgroundColor: colors.dashboard.drawerDivider },
    pressed: { opacity: 0.7 },
  });
