import React from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { DESIGN_WIDTH } from '@/utils/scale';

/*
 * design/onboarding step 2–4 frames: an indigo975 fill with two heavily blurred violet ellipses
 * (top-left at (13, 56), right at (401.5, 330.5)). Each is drawn as a Gaussian glow whose peak and
 * spread were fitted to Figma's own PNG export (png/step2-empty-figma@2x.png: RMS 0.87/255, max 3.9
 * over 1,042 header pixels; max 3.6 against the 2b export). rsvg renders these blurs much darker than
 * Figma, so the SVG renders were not used for this. Only the header shows: the sheet covers the rest.
 */
const GLOWS = [
  { id: 'glowTopLeft', cx: 13, cy: 56, sx: 166, sy: 170, peak: 0.335 },
  { id: 'glowRight', cx: 401.5, cy: 330.5, sx: 140, sy: 140, peak: 0.14 },
];
/** The radial gradient runs to 3 sigma; stops sample exp(-(3u)^2 / 2). */
const STOPS = Array.from({ length: 11 }, (_, i) => i / 10).map(u => ({ u, a: Math.exp(-((3 * u) ** 2) / 2) }));

export default function OnboardingBackground() {
  const { colors } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const s = W / DESIGN_WIDTH;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: colors.background.onboardingBase }]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          {GLOWS.map(g => (
            <RadialGradient
              key={g.id}
              id={g.id}
              gradientUnits="userSpaceOnUse"
              cx={g.cx * s}
              cy={g.cy * s}
              fx={g.cx * s}
              fy={g.cy * s}
              rx={3 * g.sx * s}
              ry={3 * g.sy * s}
            >
              {STOPS.map(({ u, a }) => (
                <Stop key={u} offset={u} stopColor={colors.background.glow} stopOpacity={g.peak * a} />
              ))}
            </RadialGradient>
          ))}
        </Defs>
        {GLOWS.map(g => (
          <Rect key={g.id} x={0} y={0} width={W} height={H} fill={`url(#${g.id})`} />
        ))}
      </Svg>
    </View>
  );
}
