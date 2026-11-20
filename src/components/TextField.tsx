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
import AppText from './AppText';

type InputVariant = 'input' | 'inputLarge' | 'inputSmall';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  label: string;
  /**
   * 'dark' (default): the auth screens' translucent pill on the gradient.
   * 'light': the onboarding sheet's 48pt field (light bg, dark text, radius 8, label flush left).
   */
  variant?: 'dark' | 'light';
  /** Rendered after the input, e.g. the DateField calendar icon. */
  rightAccessory?: ReactNode;
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
    variant = 'dark',
    rightAccessory,
    prefix,
    error,
    inputVariant,
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
  const base = useThemedStyles(makeStyles);
  const light = useThemedStyles(makeLightStyles);
  const isLight = variant === 'light';
  const styles = isLight ? light : base;
  const textVariant = inputVariant ?? (isLight ? 'inputSmall' : 'input');
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      <AppText
        variant={isLight ? 'fieldLabel' : 'label'}
        color={isLight ? 'text.onLight' : 'text.primary'}
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
          <AppText variant={textVariant} style={styles.prefix} importantForAccessibility="no">
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
          style={[styles.input, theme.typography.variants[textVariant]]}
          placeholderTextColor={isLight ? theme.colors.text.onLightMuted : theme.colors.text.placeholder}
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
        {rightAccessory}
      </View>
      {!!error && (
        <AppText
          variant="error"
          color={isLight ? 'status.errorOnLight' : 'status.error'}
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

/** variant="light" (onboarding): measured from design/onboarding/step1-profile-form.svg. */
const makeLightStyles = ({ colors, sizes, radius }: Theme) =>
  StyleSheet.create({
    // Label cap-top → field top is 21.4pt in Figma: 18pt line box (cap starts ~4.3pt in) + 8.
    label: { marginBottom: 8 },
    container: {
      height: sizes.inputHeightLight,
      borderRadius: radius.field,
      backgroundColor: colors.input.lightBackground,
      borderWidth: 1,
      borderColor: colors.input.lightBorder,
      paddingHorizontal: sizes.inputPaddingLight,
      flexDirection: 'row',
      alignItems: 'center',
    },
    containerFocused: { borderColor: colors.input.borderFocused },
    containerError: { borderColor: colors.status.errorOnLight },
    prefix: { marginRight: 8 },
    input: {
      flex: 1,
      height: '100%',
      padding: 0,
      color: colors.text.onLight,
      includeFontPadding: false,
      textAlignVertical: 'center',
    },
    error: { marginTop: 6 },
  });
