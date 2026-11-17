import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import GradientBackground from '@/components/GradientBackground';
import { useTheme, type Theme } from '@/theme';

export default function PlaceholderScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  return (
    <GradientBackground style={styles.container}>
      <Text style={styles.title}>STEROW setup OK</Text>
    </GradientBackground>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xl,
    },
    title: {
      color: colors.text.primary,
      fontFamily: typography.fontFamily.semiBold,
      fontSize: typography.fontSize.xl,
      lineHeight: typography.lineHeight.xl,
    },
  });
