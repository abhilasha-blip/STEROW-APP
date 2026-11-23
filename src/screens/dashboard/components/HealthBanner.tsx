import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';
import ArrowRight from '@/assets/icons/arrow-right.svg';
import CheckCircle from '@/assets/icons/check-circle.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import ProgressRing from './ProgressRing';

const BANNER = require('@/assets/images/dashboard/health-banner.jpg');
const t = strings.dashboard.health;
/** TODO(backend): vehicle health score. Static until there is an API. */
const HEALTH_PERCENT = 80;

/** dashboard.svg "Check your vehicle health" banner: 354×160 (r20) photo + dark gradient + 80% ring. */
function HealthBanner({ onPress }: { onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID="health-banner"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.a11y(HEALTH_PERCENT)}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <Image source={BANNER} style={StyleSheet.absoluteFill} resizeMode="cover" />
      <Svg style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id="shade" x1="0" y1="0" x2="1" y2="0">
            <Stop offset="0" stopColor={colors.dashboard.healthOverlay} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.dashboard.healthOverlay} stopOpacity={0.2} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#shade)" />
      </Svg>
      <View style={styles.text}>
        <AppText variant="bannerTitle" color="dashboard.onImage">
          {t.title}
        </AppText>
        <AppText variant="tiny" color="dashboard.onImage" style={styles.body}>
          {t.body}
        </AppText>
        <View style={styles.cta}>
          <AppText variant="cardTitle" color="dashboard.banner">
            {t.cta}
          </AppText>
          <ArrowRight width={14} height={12} color={colors.dashboard.banner} />
        </View>
      </View>
      <View style={styles.ringCircle}>
        <ProgressRing
          size={92}
          strokeWidth={10}
          percent={HEALTH_PERCENT}
          trackColor={colors.dashboard.healthRingTrack}
          fillColor={colors.dashboard.healthRingFill}
        >
          <AppText variant="ringValue" color="dashboard.onImage">{`${HEALTH_PERCENT}%`}</AppText>
          <AppText variant="tinyStrong" color="dashboard.onImage">
            {t.healthy}
          </AppText>
        </ProgressRing>
        <View style={styles.check}>
          <CheckCircle width={22} height={22} color={colors.dashboard.healthCheck} />
        </View>
      </View>
    </Pressable>
  );
}

export default memo(HealthBanner);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    banner: {
      height: 160,
      borderRadius: radius.sheet,
      overflow: 'hidden',
      flexDirection: 'row',
      alignItems: 'center',
      paddingLeft: 20,
      paddingRight: 24,
      backgroundColor: colors.dashboard.headerBase,
    },
    text: { flex: 1 },
    body: { marginTop: 8 },
    cta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 14 },
    ringCircle: {
      width: 104,
      height: 104,
      borderRadius: 52,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.dashboard.healthRingCircle,
      borderWidth: 1,
      borderColor: colors.dashboard.healthRingBorder,
    },
    check: { position: 'absolute', top: 2, right: 2 },
    pressed: { opacity: 0.9 },
  });
