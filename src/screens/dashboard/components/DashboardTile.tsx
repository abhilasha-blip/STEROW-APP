import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import AppText from '@/components/AppText';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

export type DashboardTileProps = {
  icon: React.FC<SvgProps>;
  title: string;
  /** "2 Available"; "–" when unknown. */
  count: string;
  alert?: boolean;
  disabled?: boolean;
  onPress: () => void;
  testID?: string;
};

/** dashboard.svg tile: 169×126 (r20), mist fill, 36pt icon circle, title (SemiBold 16) and violet count. */
function DashboardTile({ icon: Icon, title, count, alert, disabled, onPress, testID }: DashboardTileProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      accessibilityLabel={`${title}, ${count}`}
      style={({ pressed }) => [styles.tile, disabled && styles.disabled, pressed && styles.pressed]}
    >
      <View style={styles.iconCircle}>
        <Icon width={20} height={20} color={disabled ? colors.dashboard.disabledText : colors.dashboard.tileIcon} />
      </View>
      <AppText variant="cardTitle" color={disabled ? 'dashboard.disabledText' : 'dashboard.tileTitle'} style={styles.title}>
        {title}
      </AppText>
      <AppText
        variant="count"
        color={disabled ? 'dashboard.disabledText' : alert ? 'dashboard.countAlert' : 'dashboard.count'}
        style={styles.count}
      >
        {count}
      </AppText>
    </Pressable>
  );
}

export default memo(DashboardTile);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    tile: {
      flex: 1,
      height: 126,
      padding: 17,
      borderRadius: radius.sheet,
      backgroundColor: colors.dashboard.tile,
      borderWidth: 1,
      borderColor: colors.dashboard.tileBorder,
    },
    disabled: { backgroundColor: colors.dashboard.tileDisabled },
    iconCircle: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: colors.dashboard.tileIconCircle,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { marginTop: 20 },
    count: { marginTop: 4 },
    pressed: { opacity: 0.85 },
  });
