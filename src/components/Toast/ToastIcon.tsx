import React from 'react';
import Svg, { Circle, Path } from 'react-native-svg';

type Props = { type: 'success' | 'error'; color: string; size: number };

/** Check (success) or exclamation (error) in a ring, stroked with the given theme colour. */
export default function ToastIcon({ type, color, size }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx={12} cy={12} r={10} stroke={color} strokeWidth={2} />
      {type === 'success' ? (
        <Path d="M7.5 12.5l3 3 6-6.5" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      ) : (
        <Path d="M12 7v6M12 16.5v.5" stroke={color} strokeWidth={2} strokeLinecap="round" />
      )}
    </Svg>
  );
}
