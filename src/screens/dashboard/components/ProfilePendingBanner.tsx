import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AlertCircle from '@/assets/icons/dashboard/alert-circle.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import ProgressRing from './ProgressRing';

const t = strings.dashboard;

/** dashboard-incomplete.svg: lime 354×54 pill (r27): "(!) Your Profile info pending  Complete Now  (50%)". */
function ProfilePendingBanner({ percent, onPress }: { percent: number; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID="profile-pending"
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={t.profilePendingA11y(percent)}
      style={({ pressed }) => [styles.banner, pressed && styles.pressed]}
    >
      <AlertCircle width={20} height={20} color={colors.dashboard.bannerText} />
      <AppText
        variant="cardSubtitle"
        color="dashboard.bannerText"
        style={styles.text}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
      >
        {t.profilePending}
      </AppText>
      <AppText variant="tinyStrong" color="dashboard.count">
        {t.completeNow}
      </AppText>
      <View style={styles.ring}>
        <ProgressRing
          testID="profile-pending-ring"
          size={35}
          strokeWidth={3}
          percent={percent}
          trackColor={colors.dashboard.progressTrack}
          fillColor={colors.dashboard.progressFill}
        >
          <AppText variant="tinyStrong" color="dashboard.count" style={styles.percent}>
            {`${percent}%`}
          </AppText>
        </ProgressRing>
      </View>
    </Pressable>
  );
}

export default memo(ProfilePendingBanner);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    banner: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 54,
      paddingLeft: 14,
      paddingRight: 8,
      borderRadius: radius.pill,
      backgroundColor: colors.dashboard.banner,
      borderWidth: 1,
      borderColor: colors.dashboard.cardBorder,
      gap: 6,
    },
    text: { flex: 1 },
    ring: { marginLeft: 2 },
    percent: { fontSize: 10 },
    pressed: { opacity: 0.9 },
  });
