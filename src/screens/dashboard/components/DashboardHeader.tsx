import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Ellipse, G, Image as SvgImage, LinearGradient, Mask, RadialGradient, Rect, Stop } from 'react-native-svg';
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

/** dashboard.svg: the car photo's rect (the 4096×2731 fill stretched into it, no crop). */
export const CAR_RECT = { x: 144, y: 20, width: 441, height: 294 } as const;
/**
 * The photo is an opaque JPEG on a near-black background and the Figma export draws it as a plain rect
 * (no mask / blend), which leaves a hard black block from x 144 and y 20. Its left and top edges fade
 * out over these widths instead, so the base + glow show through; the car itself (from x ≈ 265) is
 * untouched.
 */
export const CAR_FADE = { left: 120, top: 70 } as const;

/**
 * The Figma glow: ellipse 138×140.5 at (32, 37.5), violetGlow @ 0.8, Gaussian blur σ 177. Blurred that much
 * it is a soft Gaussian (peak ≈ 0.21 alpha, σ_eff ≈ 190): sampled here as radial stops out to r 500.
 * Opacities are relative to colors.dashboard.headerGlow (already 0.8 alpha).
 */
const GLOW_R = 500;
export const GLOW_STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1].map(offset => ({
  offset,
  opacity: offset === 1 ? 0 : (0.21 / 0.8) * Math.exp(-((offset * GLOW_R) ** 2) / (2 * 190 ** 2)),
}));

/**
 * dashboard.svg header: indigo base, the blurred violet glow top-left, the car photo on the right
 * (441×294 at x 144, y 20; edges faded, see CAR_FADE), menu, STEROW logo, bell, SOS,
 * "Welcome <first name>!" and the email.
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
  const carX = CAR_RECT.x;
  const carY = CAR_RECT.y + dy;
  return (
    <View style={[styles.root, { height: HEADER_HEIGHT + dy + 24 }]}>
      <Svg testID="dashboard-header-art" style={StyleSheet.absoluteFill} pointerEvents="none">
        <Defs>
          <RadialGradient id="glow" cx="32" cy="37.5" rx={GLOW_R} ry={GLOW_R} gradientUnits="userSpaceOnUse">
            {GLOW_STOPS.map(stop => (
              <Stop key={stop.offset} offset={stop.offset} stopColor={colors.dashboard.headerGlow} stopOpacity={stop.opacity} />
            ))}
          </RadialGradient>
          <LinearGradient id="carFadeLeft" x1={carX} y1="0" x2={carX + CAR_FADE.left} y2="0" gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="white" stopOpacity={0} />
            <Stop offset="1" stopColor="white" stopOpacity={1} />
          </LinearGradient>
          <LinearGradient id="carFadeTop" x1="0" y1={carY} x2="0" y2={carY + CAR_FADE.top} gradientUnits="userSpaceOnUse">
            <Stop offset="0" stopColor="white" stopOpacity={0} />
            <Stop offset="1" stopColor="white" stopOpacity={1} />
          </LinearGradient>
          <Mask id="carMaskLeft" maskUnits="userSpaceOnUse" x={carX} y={carY} width={CAR_RECT.width} height={CAR_RECT.height}>
            <Rect x={carX} y={carY} width={CAR_RECT.width} height={CAR_RECT.height} fill="url(#carFadeLeft)" />
          </Mask>
          <Mask id="carMaskTop" maskUnits="userSpaceOnUse" x={carX} y={carY} width={CAR_RECT.width} height={CAR_RECT.height}>
            <Rect x={carX} y={carY} width={CAR_RECT.width} height={CAR_RECT.height} fill="url(#carFadeTop)" />
          </Mask>
        </Defs>
        <Ellipse cx="32" cy="37.5" rx={GLOW_R} ry={GLOW_R} fill="url(#glow)" />
        <G mask="url(#carMaskTop)">
          <SvgImage
            testID="dashboard-header-car"
            href={CAR}
            x={carX}
            y={carY}
            width={CAR_RECT.width}
            height={CAR_RECT.height}
            preserveAspectRatio="none"
            mask="url(#carMaskLeft)"
          />
        </G>
      </Svg>
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
    topRow: { flexDirection: 'row', alignItems: 'center', paddingLeft: 30, paddingRight: 24, height: 36 },
    menu: { width: 24, height: 24 },
    // The logo's glyphs start 8.7pt into the 109pt frame: lands at x 68 like the design.
    logo: { marginLeft: 6 },
    flex: { flex: 1 },
    round: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
    bell: { backgroundColor: colors.dashboard.headerIconButton, borderColor: colors.dashboard.headerIconButtonBorder },
    sos: { marginLeft: 8, backgroundColor: colors.dashboard.sos, borderColor: colors.dashboard.sos },
    welcome: { marginTop: 29, marginLeft: 24 },
    email: { marginTop: 4, marginLeft: 24 },
  });
