import React, { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import ChevronRight from '@/assets/icons/dashboard/chevron-right.svg';
import AppText from '@/components/AppText';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

/** dashboard-incomplete-2.svg row: 354×64 (r20), 36pt icon tile (r8), title + violet "Update …", chevron. */
function TaskRow({
  icon: Icon,
  title,
  subtitle,
  onPress,
  testID,
}: {
  icon: React.FC<SvgProps>;
  title: string;
  subtitle: string;
  onPress: () => void;
  testID?: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}. ${subtitle}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconTile}>
        <Icon width={22} height={22} color={colors.dashboard.tileIcon} />
      </View>
      <View style={styles.text}>
        <AppText variant="cardTitle" color="dashboard.tileTitle">
          {title}
        </AppText>
        <AppText variant="count" color="dashboard.count">
          {subtitle}
        </AppText>
      </View>
      <ChevronRight width={20} height={20} color={colors.dashboard.muted} />
    </Pressable>
  );
}

export default memo(TaskRow);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 64,
      paddingLeft: 17,
      paddingRight: 18,
      borderRadius: radius.sheet,
      backgroundColor: colors.dashboard.card,
      borderWidth: 1,
      borderColor: colors.dashboard.tileBorder,
    },
    iconTile: {
      width: 36,
      height: 36,
      borderRadius: radius.sm,
      backgroundColor: colors.dashboard.rowIconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: { flex: 1, marginLeft: 16 },
    pressed: { opacity: 0.85 },
  });
