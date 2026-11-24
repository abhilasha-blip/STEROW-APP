import React, { useCallback, type PropsWithChildren, type ReactNode, type Ref } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StatusBar, StyleSheet, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ArrowLeft from '@/assets/icons/arrow-left.svg';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import AppText from './AppText';

export type LightScreenProps = PropsWithChildren<{
  title: string;
  onBack?: () => void;
  /** Pinned under the scrolling content (e.g. "Upload documents", "Share Access"). */
  footer?: ReactNode;
  /** Right side of the header row. */
  headerRight?: ReactNode;
  /** Pinned under the header, above the scrolling content (e.g. the Book a Service stepper). */
  subHeader?: ReactNode;
  scrollRef?: Ref<React.ComponentRef<typeof ScrollView>>;
  /** The screen sits above the bottom tabs: no extra bottom safe-area padding. */
  aboveTabs?: boolean;
  scroll?: boolean;
  testID?: string;
}>;

/**
 * Light screens opened from the drawer / dashboard (my-documents.png, share-access.svg, my-profile.png):
 * mist background, back arrow + title (20 SemiBold, indigo), 24pt side margins.
 */
export default function LightScreen({
  title,
  onBack,
  footer,
  headerRight,
  subHeader,
  scrollRef,
  aboveTabs = false,
  scroll = true,
  testID,
  children,
}: LightScreenProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // Dark status bar text on the light background while this screen is focused (tab screens stay mounted).
  useFocusEffect(useCallback(() => StatusBar.setBarStyle('dark-content', true), []));
  return (
    <View testID={testID} style={[styles.root, { paddingTop: insets.top + 16 }]}>
      <View style={styles.header}>
        {onBack && (
          <Pressable
            testID="light-screen-back"
            onPress={onBack}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel={strings.common.back}
            style={styles.back}
          >
            <ArrowLeft width={24} height={24} color={colors.background.gradientEnd} />
          </Pressable>
        )}
        <AppText variant="headerTitle" color="background.gradientEnd" accessibilityRole="header" style={styles.title}>
          {title}
        </AppText>
        {headerRight}
      </View>
      {subHeader}
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            ref={scrollRef}
            style={styles.flex}
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.flex, styles.content]}>{children}</View>
        )}
        {footer && <View style={[styles.footer, !aboveTabs && { paddingBottom: Math.max(insets.bottom, 16) }]}>{footer}</View>}
      </KeyboardAvoidingView>
    </View>
  );
}

/* my-documents.svg: arrow at x 34.8, title at x 68 (≈ 24 + 24 + 20), header row ≈ 72–84. */
const makeStyles = ({ colors, spacing }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.dashboard.background },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: spacing.screenPaddingH,
      marginBottom: spacing.xl,
      minHeight: 32,
    },
    back: { marginLeft: 8, marginRight: 20 },
    title: { flex: 1 },
    flex: { flex: 1 },
    content: { paddingHorizontal: spacing.screenPaddingH, paddingBottom: spacing.xl },
    footer: { paddingHorizontal: spacing.screenPaddingH, paddingTop: spacing.md, paddingBottom: spacing.lg },
  });
