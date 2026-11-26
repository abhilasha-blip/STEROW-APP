import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import type { DocumentStatus } from '@/utils/documentStatus';

const t = strings.myDocuments;

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  active: t.active,
  expiringSoon: t.expiringSoon,
  expired: t.expired,
};

const STATUS_COLOR = {
  active: 'statusActive',
  expiringSoon: 'statusExpiring',
  expired: 'statusExpired',
} as const satisfies Record<DocumentStatus, string>;

/** The Active / Expiring soon / Expired pill (my-documents.svg: 19pt, r9.5, grey border, coloured dot). */
function StatusPill({ status, testID, style }: { status: DocumentStatus; testID?: string; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const color = STATUS_COLOR[status];
  return (
    <View testID={testID} style={[styles.pill, style]}>
      <View style={[styles.dot, { backgroundColor: colors.dashboard[color] }]} />
      <AppText variant="tinyStrong" color={`dashboard.${color}`}>
        {STATUS_LABEL[status]}
      </AppText>
    </View>
  );
}

export default memo(StatusPill);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      height: 19,
      paddingHorizontal: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.dashboard.pillBorder,
      backgroundColor: colors.dashboard.card,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
  });
