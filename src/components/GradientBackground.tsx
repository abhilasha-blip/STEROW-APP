import React, { type PropsWithChildren } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@/theme';

type GradientBackgroundProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
}>;

/**
 * Full-screen app background gradient built from theme tokens.
 *
 * The gradient is rendered as a childless, absolutely-filled layer with the
 * content as a sibling. react-native-linear-gradient is a legacy component that
 * runs through the New Architecture interop layer, and when it wraps children
 * directly the gradient and its children are mis-positioned on iOS.
 */
export default function GradientBackground({ style, children }: GradientBackgroundProps) {
  const { colors } = useTheme();
  const { gradientStart, gradientMid, gradientEnd } = colors.background;

  return (
    <View style={[styles.root, style]}>
      <LinearGradient
        colors={[gradientStart, gradientMid, gradientEnd]}
        locations={[0, 0.55, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
