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
 * A TextField whose text lives in the native input (uncontrolled). Typing never round-trips through JS
 * to be displayed, so it can't lag or "buffer": a controlled `value` makes React Native push JS's text
 * back into the native view after every keystroke, and when the JS thread is a beat behind (debug
 * builds, a busy device) that overwrites what was just typed.
 *
 * JS only writes the text when it has to: when `format` changes what was typed (a pasted "+91 …", a
 * letter in a number field) or via `setValue` (e.g. a country switch). For that one render the input
 * gets a `value`; the next keystroke drops it again. The screen reads the text from `onValueChange`
 * (into a ref) or the imperative handle; typing re-renders nothing around the field.
 *
 * Dropping `value` must not move the text: React Native sends `text = value ?? defaultValue` to the
 * native input on every render, so `defaultValue` is moved to the current text in the same update
 * (a fixed mount-time `defaultValue` made the next keystroke after a correction reset the whole field,
 * e.g. UAE: a 10th digit trimmed, then backspace → empty).
 */
const BufferedTextField = forwardRef<BufferedTextFieldHandle, BufferedTextFieldProps>(
  function BufferedTextFieldInner({ initialValue = '', format, onValueChange, ...fieldProps }, ref) {
    const [initial] = useState(() => (format ? format(initialValue) : initialValue));
    const valueRef = useRef(initial);
    /**
     * `forced`: a correction to push into the native input; undefined = uncontrolled (the normal state).
     * `base`: the defaultValue, i.e. what RN shows when `forced` is undefined. Only changes together with
     * `forced`, so clean keystrokes still cause no render.
     */
    const [state, setState] = useState<{ forced?: string; base: string }>({ base: initial });
    const inputRef = useRef<React.ComponentRef<typeof TextInput>>(null);

    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        blur: () => inputRef.current?.blur(),
        setValue: next => {
          valueRef.current = next;
          setState(prev => ({ ...prev, forced: next }));
        },
        getValue: () => valueRef.current,
      }),
      [],
    );

    const onChangeText = useCallback(
      (text: string) => {
        const next = format ? format(text) : text;
        valueRef.current = next;
        setState(prev => {
          if (next !== text) {
            return { forced: next, base: prev.base }; // push the corrected text
          }
          // Clean keystroke: no render while already uncontrolled (same state → React bails out); after a
          // correction, go uncontrolled with defaultValue = this text, so the native text doesn't change.
          return prev.forced === undefined ? prev : { forced: undefined, base: next };
        });
        onValueChange?.(next);
      },
      [format, onValueChange],
    );

    return (
      <TextField
        ref={inputRef}
        {...fieldProps}
        defaultValue={state.base}
        value={state.forced}
        onChangeText={onChangeText}
      />
    );
  },
);

export default memo(BufferedTextField);
