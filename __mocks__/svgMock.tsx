// .svg imports are React components at runtime (react-native-svg-transformer); in tests: a plain View.
import React from 'react';
import { View, type ViewProps } from 'react-native';

export default function SvgMock(props: ViewProps) {
  return <View {...props} />;
}
