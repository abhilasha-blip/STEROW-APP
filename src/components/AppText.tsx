import React from 'react';
import { StyleSheet, Text, type TextProps } from 'react-native';
import { resolveColor, useTheme, type ColorToken, type TypographyVariant } from '@/theme';

export type AppTextProps = TextProps & {
  variant?: TypographyVariant;
  /** Semantic colour token path, e.g. 'text.secondary'. */
  color?: ColorToken;
};

/** The only way text is rendered in the app: theme font + theme colour, never system defaults. */
export default function AppText({
  variant = 'label',
  color = 'text.primary',
  style,
  maxFontSizeMultiplier = 1.3,
  ...rest
}: AppTextProps) {
  const theme = useTheme();
  return (
    <Text
      {...rest}
      maxFontSizeMultiplier={maxFontSizeMultiplier}
      style={[
        styles.base,
        theme.typography.variants[variant],
        { color: resolveColor(theme.colors, color) },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  // Android adds extra top padding for ascenders by default; Figma doesn't.
  base: { includeFontPadding: false },
});
