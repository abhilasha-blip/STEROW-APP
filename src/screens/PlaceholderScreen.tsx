import React, { useMemo } from 'react';
import { StyleSheet, Text } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme, type Theme } from '@/theme';

export default function PlaceholderScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { background } = theme.colors;

  return (
    <LinearGradient
      colors={[background.gradientStart, background.gradientMid, background.gradientEnd]}
      locations={[0, 0.55, 1]}
      style={styles.container}
    >
      <Text style={styles.title}>STEROW setup OK</Text>
    </LinearGradient>
  );
}

const createStyles = ({ colors, typography, spacing }: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
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
