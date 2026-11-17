import { useMemo } from 'react';
import { useWindowDimensions } from 'react-native';

/** Figma design frame (iPhone 16/17 Pro). */
export const DESIGN_WIDTH = 402;
export const DESIGN_HEIGHT = 874;

export type Scale = {
  /** Horizontal: scales linearly with screen width. */
  s: (size: number) => number;
  /** Vertical: moderate – only half of the height difference is applied. */
  vs: (size: number, factor?: number) => number;
  /** Moderate horizontal scale, for things like icon sizes. */
  ms: (size: number, factor?: number) => number;
};

export function createScale(width: number, height: number): Scale {
  const wr = width / DESIGN_WIDTH;
  const hr = height / DESIGN_HEIGHT;
  return {
    s: size => size * wr,
    vs: (size, factor = 0.5) => size * (1 + (hr - 1) * factor),
    ms: (size, factor = 0.5) => size * (1 + (wr - 1) * factor),
  };
}

/** Scale helpers bound to the current window size (updates on rotation/resize). */
export function useScale(): Scale {
  const { width, height } = useWindowDimensions();
  return useMemo(() => createScale(width, height), [width, height]);
}
