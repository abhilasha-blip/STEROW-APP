import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, RadialGradient, Stop } from 'react-native-svg';
import Bell from '@/assets/icons/dashboard/bell.svg';
import Menu from '@/assets/icons/dashboard/menu.svg';
import Sos from '@/assets/icons/dashboard/sos.svg';
import LogoFull from '@/assets/icons/logo-full.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const CAR = require('@/assets/images/dashboard/header-car.jpg');
const t = strings.dashboard;

/** Height of the dark header down to where the light sheet starts (dashboard.svg: y 222). */
export const HEADER_HEIGHT = 222;
/** Figma frame's status-bar area (the header's y values are measured from the frame top). */
const FRAME_SAFE_TOP = 54;

/**
 * dashboard.svg header: indigo base + a blurred violet glow top-left, the car photo on the right
 * (441×294 at x 144, y 20), menu, STEROW logo, bell, SOS, "Welcome <first name>!" and the email.
 */
function DashboardHeader({
  firstName,
  email,
  onMenu,
  onBell,
  onSos,
}: {
  firstName: string;
  email: string;
  onMenu: () => void;
  onBell: () => void;
  onSos: () => void;
}) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Shift the frame's absolute y values by the device's real safe area.
  const dy = insets.top - FRAME_SAFE_TOP;
  return (
    <View style={[styles.root, { height: HEADER_HEIGHT + dy + 24 }]}>
      <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow" cx="32" cy="37.5" rx="250" ry="250" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor={colors.dashboard.headerGlow} stopOpacity={0.55} />
            <Stop offset="1" stopColor={colors.dashboard.headerGlow} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Ellipse cx="32" cy="37.5" rx="250" ry="250" fill="url(#glow)" />
      </Svg>
      <Image source={CAR} style={[styles.car, { top: 20 + dy }]} resizeMode="cover" accessibilityIgnoresInvertColors />

      <View style={[styles.topRow, { marginTop: 60 + dy }]}>
        <Pressable
          testID="dashboard-menu"
          onPress={onMenu}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t.menuA11y}
          style={styles.menu}
        >
          <Menu width={24} height={24} color={colors.dashboard.onImage} />
        </Pressable>
        <View accessible accessibilityRole="image" accessibilityLabel="STEROW" style={styles.logo}>
          <LogoFull width={109} height={33} color={colors.dashboard.onImage} />
        </View>
        <View style={styles.flex} />
        <Pressable
          testID="dashboard-notifications"
          onPress={onBell}
          accessibilityRole="button"
          accessibilityLabel={t.notificationsA11y}
          style={[styles.round, styles.bell]}
        >
          <Bell width={20} height={20} color={colors.dashboard.headerIcon} />
        </Pressable>
        <Pressable
          testID="dashboard-sos"
          onPress={onSos}
          accessibilityRole="button"
          accessibilityLabel={t.sosA11y}
          style={[styles.round, styles.sos]}
        >
          <Sos width={20} height={20} color={colors.dashboard.sosIcon} />
        </Pressable>
      </View>

      <AppText testID="dashboard-welcome" variant="welcome" color="dashboard.onImage" style={styles.welcome} accessibilityRole="header">
        {t.welcome(firstName)}
      </AppText>
      {!!email && (
        <AppText testID="dashboard-email" variant="welcomeEmail" color="dashboard.muted" style={styles.email}>
          {email}
        </AppText>
      )}
    </View>
  );
}

export default memo(DashboardHeader);

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    root: { backgroundColor: colors.dashboard.headerBase, overflow: 'hidden' },
    car: { position: 'absolute', left: 144, width: 441, height: 294 },
    topRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 30, paddingRight: 24, height: 36 },
    menu: { width: 24, height: 24 },
    // The logo's glyphs start 8.7pt into the 109pt frame: lands at x 68 like the design.
    logo: { marginLeft: 6 },
    flex: { flex: 1 },
    round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    bell: { backgroundColor: colors.dashboard.headerIconButton, borderColor: colors.dashboard.headerIconButtonBorder },
    sos: { marginLeft: 8, backgroundColor: colors.dashboard.sos, borderColor: colors.dashboard.sos },
    welcome: { marginTop: 32, marginLeft: 24 },
    email: { marginTop: 4, marginLeft: 24 },
  });
