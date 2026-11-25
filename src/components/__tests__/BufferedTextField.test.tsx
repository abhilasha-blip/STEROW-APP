import React, { createRef } from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';
import BufferedTextField, { type BufferedTextFieldHandle } from '@/components/BufferedTextField';
import { normalizeNational } from '@/utils/phone';
import { Providers } from '../../../test/render';

/**
 * What React Native pushes into the native input on every render: TextInput passes
 * `text = value ?? defaultValue` to the native component (TextInput.js), so whenever that changes the
 * native text is replaced. It must always equal what the user typed (after formatting).
 */
const nativeText = (testID: string) => {
  const { value, defaultValue } = screen.getByTestId(testID).props;
  return typeof value === 'string' ? value : defaultValue;
};

const uae = (v: string) => normalizeNational('AE', v);

/**
 * A keystroke as the native input sees it. RN/Fabric only pushes `text` when the prop changes, so the
 * invariant is: if the text prop changed, it equals the (formatted) typed text — never an older value.
 */
async function type(text: string, format = uae) {
  const before = nativeText('f');
  await fireEvent.changeText(screen.getByTestId('f'), text);
  const after = nativeText('f');
  if (after !== before) {
    expect(after).toBe(format(text));
  }
  return after;
}

async function renderField(format = uae, initialValue = '') {
  const ref = createRef<BufferedTextFieldHandle>();
  await render(
    <Providers>
      <BufferedTextField ref={ref} testID="f" label="Mobile" initialValue={initialValue} format={format} />
    </Providers>,
  );
  return ref;
}

describe('BufferedTextField: the native text never snaps back', () => {
  it('after a formatted keystroke (UAE 10th digit trimmed), backspace removes exactly one digit', async () => {
    const ref = await renderField();
    await fireEvent.changeText(screen.getByTestId('f'), '5012345678'); // 10 digits → capped at 9
    expect(nativeText('f')).toBe('501234567');
    await fireEvent.changeText(screen.getByTestId('f'), '50123456'); // backspace
    // Root cause of the bug: `value` went back to undefined, so RN sent `defaultValue` ('') → all digits gone.
    expect(nativeText('f')).toBe('50123456');
    expect(ref.current?.getValue()).toBe('50123456');
  });

  it('after a stripped trunk 0, typing on keeps the digits', async () => {
    await renderField();
    await fireEvent.changeText(screen.getByTestId('f'), '0');
    expect(nativeText('f')).toBe('');
    await fireEvent.changeText(screen.getByTestId('f'), '5');
    expect(nativeText('f')).toBe('5');
  });

  it('after setValue (country switch), the next keystrokes keep their text', async () => {
    const ref = await renderField(uae, '501');
    await React.act(async () => ref.current?.setValue('50'));
    expect(nativeText('f')).toBe('50');
    await fireEvent.changeText(screen.getByTestId('f'), '502');
    expect(nativeText('f')).toBe('502'); // was '501' (the mount-time value)
    await type('50');
    expect(ref.current?.getValue()).toBe('50');
  });

  it('rapid typing then repeated backspace (UAE, with corrections in between): one digit per key', async () => {
    const ref = await renderField();
    for (const text of ['0', '05', '050', '0501', '05012', '050123', '0501234', '05012345', '050123456', '0501234567']) {
      await type(text);
    }
    expect(ref.current?.getValue()).toBe('501234567');
    await type('5012345678'); // an extra digit: trimmed
    let digits = '501234567';
    while (digits.length) {
      digits = digits.slice(0, -1);
      await type(digits);
      expect(ref.current?.getValue()).toBe(digits);
    }
  });

  it('rapid typing then repeated backspace (India, a pasted +91 correction in between)', async () => {
    const india = (v: string) => normalizeNational('IN', v);
    const ref = await renderField(india);
    await type('+91 98765 43210', india); // corrected to 9876543210
    expect(nativeText('f')).toBe('9876543210');
    let digits = '9876543210';
    while (digits.length) {
      digits = digits.slice(0, -1);
      await type(digits, india);
      expect(ref.current?.getValue()).toBe(digits);
    }
  });
});
