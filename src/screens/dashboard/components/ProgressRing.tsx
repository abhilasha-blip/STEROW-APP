import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

export type ProgressRingProps = {
  size: number;
  strokeWidth: number;
  /** 0–100. */
  percent: number;
  trackColor: string;
  fillColor: string;
  children?: ReactNode;
  testID?: string;
};

/** A circular progress ring (the profile banner's 50%, the health check's 80%), filled clockwise from 12. */
function ProgressRing({ size, strokeWidth, percent, trackColor, fillColor, children, testID }: ProgressRingProps) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, percent));
  return (
    <View testID={testID} style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={trackColor} strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={fillColor}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${(c * p) / 100} ${c}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={[StyleSheet.absoluteFill, styles.center]}>{children}</View>
    </View>
  );
}

export default memo(ProgressRing);

const styles = StyleSheet.create({ center: { alignItems: 'center', justifyContent: 'center' } });
