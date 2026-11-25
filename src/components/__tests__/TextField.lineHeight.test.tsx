import React from 'react';
import { Platform, StyleSheet } from 'react-native';
import { render, screen } from '@testing-library/react-native';
import TextField from '@/components/TextField';
import OtpInput from '@/components/OtpInput';
import { INPUT_LINE_HEIGHT_RATIO, iosInputCentering, variants } from '@/theme/typography';
import { Providers } from '../../../test/render';

const noop = () => {};
const inputStyle = (testID: string) => StyleSheet.flatten(screen.getByTestId(testID).props.style);

/** Descenders (g, y, p, q, j) were cut at the bottom of the inputs: no lineHeight + a fixed-height box. */
describe('TextField text is never clipped', () => {
  it.each(['input', 'inputLarge', 'inputSmall', 'otpDigit'] as const)(
    '%s has lineHeight ≥ 1.35 × fontSize',
    variant => {
      const { fontSize, lineHeight } = variants[variant];
      expect(lineHeight).toBeDefined();
      expect(lineHeight!).toBeGreaterThanOrEqual(INPUT_LINE_HEIGHT_RATIO * fontSize!);
    },
  );

  it.each([
    ['dark', undefined, 'input'],
    ['dark, large (mobile)', 'inputLarge', 'inputLarge'],
    ['light (onboarding)', undefined, 'inputSmall'],
  ] as const)('%s field: lineHeight set, no fixed height or vertical padding, centred', async (name, inputVariant, expected) => {
    await render(
      <Providers>
        <TextField
          testID="f"
          label="Full Name"
          variant={name.startsWith('light') ? 'light' : 'dark'}
          inputVariant={inputVariant}
          defaultValue="Gary Pyle Jaqueline"
        />
      </Providers>,
    );
    const style = inputStyle('f');
    expect(style.lineHeight).toBe(variants[expected].lineHeight);
    expect(style.height).toBeUndefined();
    expect(style.paddingTop ?? style.paddingVertical ?? 0).toBe(0);
    expect(style.textAlignVertical).toBe('center');
    expect(style.includeFontPadding).toBe(false);
    // iOS only: a bottom padding that re-centres the line (never clips: the field is ≥ 48pt tall).
    expect(style.paddingBottom ?? 0).toBe(Platform.OS === 'ios' ? iosInputCentering(variants[expected]) : 0);
  });

  it('iOS centring offset = 2 × (lineHeight − 1.26 × fontSize)', () => {
    expect(iosInputCentering({ fontSize: 14, lineHeight: 19 })).toBe(2.7);
    expect(iosInputCentering({ fontSize: 16, lineHeight: 22 })).toBe(3.7);
    expect(iosInputCentering({ fontSize: 16 })).toBe(0);
  });

  it('OTP digits use the otpDigit variant (lineHeight ≥ 1.35×)', async () => {
    await render(
      <Providers>
        <OtpInput value="12" onChange={noop} autoFocus={false} />
      </Providers>,
    );
    const digit = StyleSheet.flatten(screen.getByText('1').props.style);
    expect(digit.lineHeight).toBe(variants.otpDigit.lineHeight);
  });
});
