import React, { memo } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import AlertCircle from '@/assets/icons/dashboard/alert-circle.svg';
import AppText from '@/components/AppText';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

export type BlockingNoticeProps = {
  title: string;
  message: string;
  /** E.g. "Skip for now": the way past a save the backend refuses. */
  actionLabel: string;
  onAction: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * An inline card for a save the app can't fix (e.g. the licence the backend keeps hidden, 42501): the
 * reason and one way on. It never retries by itself.
 */
function BlockingNotice({ title, message, actionLabel, onAction, testID = 'blocking-notice', style }: BlockingNoticeProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View testID={testID} style={[styles.card, style]} accessibilityRole="alert">
      <View style={styles.row}>
        <AlertCircle width={20} height={20} color={colors.status.errorOnLight} />
        <AppText variant="cardTitle" color="status.errorOnLight" style={styles.title}>
          {title}
        </AppText>
      </View>
      <AppText testID={`${testID}-message`} variant="body" color="text.onLight" style={styles.message}>
        {message}
      </AppText>
      <Pressable
        testID={`${testID}-action`}
        onPress={onAction}
        accessibilityRole="button"
        hitSlop={8}
        style={({ pressed }) => [styles.action, pressed && styles.pressed]}
      >
        <AppText variant="tileAction" color="text.link">
          {actionLabel}
        </AppText>
      </Pressable>
    </View>
  );
}

export default memo(BlockingNotice);

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    card: {
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.documents.noticeBorder,
      backgroundColor: colors.documents.noticeBackground,
      padding: spacing.md,
    },
    row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
    title: { flex: 1 },
    message: { marginTop: spacing.sm },
    action: { alignSelf: 'flex-start', marginTop: spacing.md, minHeight: 32, justifyContent: 'center' },
    pressed: { opacity: 0.7 },
  });
