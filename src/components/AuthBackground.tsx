import React, { memo, useMemo } from 'react';
import {
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Svg, { Defs, RadialGradient, Rect, Stop } from 'react-native-svg';
import { useTheme } from '@/theme';
import { DESIGN_HEIGHT, DESIGN_WIDTH } from '@/utils/scale';

const glowImage = require('@/assets/images/bg-glow.png');
const carImage = require('@/assets/images/auth-car.png');

/*
 * Geometry fitted to the Figma frames (402 x 874):
 * - Linear gradient iso-lines run from (W, 0) to (0, ISO_Y * H): gradientStart in the
 *   top-left corner, gradientMid along that diagonal, gradientEnd in the bottom-right.
 * - A wide, soft glow band centred at (300, 220), Gaussian radii 475 x 200, peak 12.6%.
 * - The bottom glow is Figma's exported blurred ellipse (bg-glow.png, 402 x 468), tinted
 *   with the theme glow colour.
 * - The car (auth-car.png, 402 x 238) is pre-composited from the raw photo so it blends
 *   like the design without platform blend modes.
 */
const ISO_Y = 440 / DESIGN_HEIGHT;
const BAND = { cx: 300, cy: 220, sx: 475, sy: 200, peak: 0.126 };
const GLOW_SIZE = { w: 402, h: 468 };
const CAR_SIZE = { w: 402, h: 238 };
// Gaussian exp(-(2u)^2) sampled for a radial gradient whose radius is 2 sigma.
const BAND_STOPS = [0, 0.2, 0.4, 0.6, 0.8, 1].map(u => ({ u, a: Math.exp(-((2 * u) ** 2)) }));

type AuthBackgroundProps = {
  car?: boolean;
  style?: StyleProp<ViewStyle>;
};

function AuthBackground({ car = false, style }: AuthBackgroundProps) {
  const { colors } = useTheme();
  const { width: W, height: H } = useWindowDimensions();
  const { background } = colors;

  const gradient = useMemo(() => {
    // Perpendicular (pixel-space) gradient axis for iso-lines through (W,0) and (0, ISO_Y*H).
    const kH = ISO_Y * H;
    const d1 = 1 / Math.hypot(1 / W, 1 / kH);
    const sEnd = 1 + H / kH; // value of the iso parameter at the bottom-right corner
    const D = sEnd * d1;
    return {
      end: { x: (D * d1) / (W * W), y: (D * d1) / (kH * H) },
      locations: [0, 1 / sEnd, 1],
    };
  }, [W, H]);

  const sx = W / DESIGN_WIDTH;
  const sy = H / DESIGN_HEIGHT;

  return (
    <View
      style={[StyleSheet.absoluteFill, { backgroundColor: background.gradientEnd }, style]}
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
    >
      <LinearGradient
        colors={[background.gradientStart, background.gradientMid, background.gradientEnd]}
        locations={gradient.locations}
        start={{ x: 0, y: 0 }}
        end={gradient.end}
        style={StyleSheet.absoluteFill}
      />
      <Svg width={W} height={H} style={StyleSheet.absoluteFill}>
        <Defs>
          <RadialGradient
            id="band"
            gradientUnits="userSpaceOnUse"
            cx={BAND.cx * sx}
            cy={BAND.cy * sy}
            fx={BAND.cx * sx}
            fy={BAND.cy * sy}
            rx={2 * BAND.sx * sx}
            ry={2 * BAND.sy * sy}
          >
            {BAND_STOPS.map(({ u, a }) => (
              <Stop key={u} offset={u} stopColor={background.glow} stopOpacity={BAND.peak * a} />
            ))}
          </RadialGradient>
        </Defs>
        <Rect x={0} y={0} width={W} height={H} fill="url(#band)" />
      </Svg>
      <Image
        source={glowImage}
        style={[
          styles.bottom,
          { width: W, height: (GLOW_SIZE.h * W) / GLOW_SIZE.w, tintColor: background.glow },
        ]}
        resizeMode="stretch"
      />
      {car && (
        <Image
          source={carImage}
          style={[styles.bottom, { width: W, height: (CAR_SIZE.h * W) / CAR_SIZE.w }]}
          resizeMode="stretch"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bottom: { position: 'absolute', left: 0, bottom: 0 },
});

export default memo(AuthBackground);
