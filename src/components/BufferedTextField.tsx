import React, { forwardRef, memo, useCallback, useImperativeHandle, useRef, useState } from 'react';
import type { TextInput } from 'react-native';
import TextField, { type TextFieldProps } from './TextField';

export type BufferedTextFieldHandle = {
  focus: () => void;
  blur: () => void;
  /** Replace the text (e.g. re-normalised after a country change). Does not call onValueChange. */
  setValue: (value: string) => void;
  getValue: () => string;
};

export type BufferedTextFieldProps = Omit<TextFieldProps, 'value' | 'onChangeText' | 'defaultValue'> & {
  initialValue?: string;
  /** Cheap, synchronous clean-up of each keystroke (digits only, upper case, …). */
  format?: (text: string) => string;
  /** Called with the formatted text. Keep it cheap and stable (useCallback): store into a ref. */
  onValueChange?: (value: string) => void;
};

/**
 * A TextField that owns its text. Typing re-renders only this field, never the screen around it:
 * the screen reads the value from `onValueChange` (into a ref) or the imperative handle.
 */
const BufferedTextField = forwardRef<BufferedTextFieldHandle, BufferedTextFieldProps>(
  function BufferedTextFieldInner({ initialValue = '', format, onValueChange, ...fieldProps }, ref) {
    const [value, setValue] = useState(() => (format ? format(initialValue) : initialValue));
    const valueRef = useRef(value);
    const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        setValue: next => {
          valueRef.current = next;
          setValue(next);
        },
        getValue: () => valueRef.current,
      }),
      [],
    );

    const onChangeText = useCallback(
      (text: string) => {
        const next = format ? format(text) : text;
        valueRef.current = next;
        setValue(next);
        onValueChange?.(next);
      },
      [format, onValueChange],
    );

    return <TextField ref={inputRef} {...fieldProps} value={value} onChangeText={onChangeText} />;
  },
);

export default memo(BufferedTextField);
