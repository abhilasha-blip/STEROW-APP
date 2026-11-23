/**
 * Minimal Reanimated mock for component tests: animations resolve to their target value instantly.
 * (The library's own mock boots its native CSS layer, which isn't available under Jest.)
 * Covers exactly the APIs used in src/: Animated.View, useSharedValue, useAnimatedStyle,
 * withTiming (incl. its completion callback), withSpring, withSequence, withRepeat, cancelAnimation,
 * Easing; plus what @react-navigation/drawer needs (useDerivedValue, useAnimatedProps, interpolate,
 * runOnJS).
 */
import { useRef } from 'react';
import { View } from 'react-native';

type Animatable = number;

export const useSharedValue = <T,>(initial: T) => useRef({ value: initial }).current;
export const useAnimatedStyle = <T,>(factory: () => T): T => factory();
/** Finishes instantly: the completion callback runs synchronously with `finished = true`. */
export const withTiming = (to: Animatable, _config?: unknown, callback?: (finished: boolean) => void) => {
  callback?.(true);
  return to;
};
/** Finishes instantly (the drawer's completion callback runs synchronously). */
export const withSpring = (to: Animatable, _config?: unknown, callback?: (finished: boolean) => void) => {
  callback?.(true);
  return to;
};
export const withSequence = (...steps: Animatable[]) => steps[steps.length - 1];
export const withRepeat = (animation: Animatable) => animation;
export const cancelAnimation = () => undefined;
// @react-navigation/drawer (react-native-drawer-layout).
export const useDerivedValue = <T,>(factory: () => T) => ({ value: factory() });
export const useAnimatedProps = <T,>(factory: () => T): T => factory();
export const runOnJS = <F,>(fn: F): F => fn;
export const ReduceMotion = { System: 'system', Always: 'always', Never: 'never' } as const;
/** Linear interpolation, clamped (enough for the drawer's progress → opacity / translate). */
export const interpolate = (x: number, input: number[], output: number[]) => {
  if (x <= input[0]) {
    return output[0];
  }
  for (let i = 1; i < input.length; i++) {
    if (x <= input[i]) {
      const t = (x - input[i - 1]) / (input[i] - input[i - 1]);
      return output[i - 1] + t * (output[i] - output[i - 1]);
    }
  }
  return output[output.length - 1];
};

const ease = (t: number) => t;
export const Easing = {
  linear: ease,
  cubic: ease,
  in: (fn: typeof ease) => fn,
  out: (fn: typeof ease) => fn,
  inOut: (fn: typeof ease) => fn,
};

// Gesture Handler wraps its detectors with Animated components at import time.
export const createAnimatedComponent = <C,>(Component: C): C => Component;

const Animated = { View, createAnimatedComponent };
export default Animated;
