/**
 * Minimal Reanimated mock for component tests: animations resolve to their target value instantly.
 * (The library's own mock boots its native CSS layer, which isn't available under Jest.)
 * Covers exactly the APIs used in src/: Animated.View, useSharedValue, useAnimatedStyle,
 * withTiming, withSequence, withRepeat, cancelAnimation.
 */
import { useRef } from 'react';
import { View } from 'react-native';

type Animatable = number;

export const useSharedValue = <T,>(initial: T) => useRef({ value: initial }).current;
export const useAnimatedStyle = <T,>(factory: () => T): T => factory();
export const withTiming = (to: Animatable) => to;
export const withSequence = (...steps: Animatable[]) => steps[steps.length - 1];
export const withRepeat = (animation: Animatable) => animation;
export const cancelAnimation = () => undefined;

const Animated = { View };
export default Animated;
