import React, { forwardRef, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';
import { useThemedStyles, useTheme, type Theme } from '@/theme';

type InputVariant = 'input' | 'inputLarge';
import AppText from './AppText';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /** Rendered before the input, e.g. "+91". Strings get input typography in text.primary. */
  prefix?: ReactNode;
  error?: string;
  /** Typography for the typed text, placeholder and prefix. */
  inputVariant?: InputVariant;
  /** Left padding inside the pill (Figma: 20 for plain fields, 16 when a prefix is shown). */
  paddingStart?: number;
  style?: StyleProp<ViewStyle>;
};

type TextInputRef = React.ComponentRef<typeof TextInput>;

const TextField = forwardRef<TextInputRef, TextFieldProps>(function TextFieldInner(
  {
    label,
    prefix,
    error,
    inputVariant = 'input',
    paddingStart,
    style,
    onFocus,
    onBlur,
    accessibilityLabel,
    ...inputProps
  },
  ref,
) {
  const theme = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      <AppText
        variant="label"
        style={styles.label}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        {label}
      </AppText>
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          !!error && styles.containerError,
          paddingStart !== undefined && { paddingLeft: paddingStart },
        ]}
      >
        {typeof prefix === 'string' ? (
          <AppText variant={inputVariant} style={styles.prefix} importantForAccessibility="no">
            {prefix}
          </AppText>
        ) : (
          prefix
        )}
        <TextInput
          ref={ref}
          {...inputProps}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error}
          style={[styles.input, theme.typography.variants[inputVariant]]}
          placeholderTextColor={theme.colors.text.placeholder}
          selectionColor={theme.colors.primary.main}
          cursorColor={theme.colors.primary.main}
          onFocus={e => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={e => {
            setFocused(false);
            onBlur?.(e);
          }}
        />
      </View>
      {!!error && (
        <AppText
          variant="error"
          color="status.error"
          style={styles.error}
          accessibilityLiveRegion="polite"
        >
          {error}
        </AppText>
      )}
    </View>
  );
});

export default TextField;

const makeStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    label: { marginLeft: 16, marginBottom: 6.5 },
    container: {
      height: sizes.inputHeight,
      borderRadius: radius.pill,
      backgroundColor: colors.input.background,
      borderWidth: 1,
      borderColor: colors.input.border,
      paddingHorizontal: sizes.inputPaddingH,
      flexDirection: 'row',
      alignItems: 'center',
    },
    containerFocused: { borderColor: colors.input.borderFocused },
    containerError: { borderColor: colors.status.error },
    prefix: { marginRight: 8 },
    input: {
      flex: 1,
      height: '100%',
      padding: 0,
      color: colors.text.primary,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    error: { marginTop: 6, marginLeft: 16 },
  });
