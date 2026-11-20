import React, { forwardRef, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
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
  /** Don't draw the label (it still names the input for screen readers), e.g. a search box. */
  labelHidden?: boolean;
  /**
   * 'dark' (default): the auth screens' translucent pill on the gradient.
   * 'light': the onboarding sheet's 48pt field (light bg, dark text, radius 8, label flush left).
   */
  variant?: 'dark' | 'light';
  /** Rendered after the input, e.g. the DateField calendar icon. */
  rightAccessory?: ReactNode;
  /** Rendered before the input, e.g. "+91". Strings get input typography in text.primary. */
  prefix?: ReactNode;
  /**
   * A 16pt glyph before the input (search icon, "₹"). Figma (step4-service): the glyph starts 17pt in
   * and the text 49pt in, i.e. 16pt after the glyph.
   */
  leftIcon?: ReactNode;
  /** Small violet spinner on the right (vehicle-number lookup, step2-number-autofill.svg); replaces rightAccessory. */
  loading?: boolean;
  /**
   * Not available yet (e.g. "Vehicle Model" before a make): muted text and a faded field. The label stays
   * as is. Implies editable={false}.
   */
  disabled?: boolean;
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
    labelHidden = false,
    variant = 'dark',
    rightAccessory,
    prefix,
    leftIcon,
    loading = false,
    disabled = false,
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
      {!labelHidden && (
        <AppText
          variant={isLight ? 'fieldLabel' : 'label'}
          color={isLight ? 'text.onLight' : 'text.primary'}
          style={styles.label}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          {label}
        </AppText>
      )}
      <View
        style={[
          styles.container,
          focused && styles.containerFocused,
          !!error && styles.containerError,
          disabled && styles.containerDisabled,
          paddingStart !== undefined && { paddingLeft: paddingStart },
        ]}
      >
        {leftIcon ? (
          <View style={styles.leftIcon} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
            {leftIcon}
          </View>
        ) : null}
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
          editable={disabled ? false : inputProps.editable}
          accessibilityLabel={accessibilityLabel ?? label}
          accessibilityHint={error ?? inputProps.accessibilityHint}
          accessibilityState={loading || disabled ? { busy: loading, disabled } : undefined}
          style={[
            styles.input,
            theme.typography.variants[textVariant],
            disabled && { color: isLight ? theme.colors.text.onLightMuted : theme.colors.text.placeholder },
          ]}
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
        {loading ? (
          <ActivityIndicator
            testID={inputProps.testID ? `${inputProps.testID}-loading` : undefined}
            size="small"
            color={theme.colors.input.lightSpinner}
            style={styles.spinner}
          />
        ) : (
          rightAccessory
        )}
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
    containerDisabled: { opacity: 0.5 },
    prefix: { marginRight: 8 },
    leftIcon: { width: 16, alignItems: 'center', marginRight: 16 },
    spinner: { marginLeft: 8, marginRight: 4 },
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
    // step2-number-autofill.svg: the focused field keeps its fill and gets a 1pt indigo border.
    containerFocused: { borderColor: colors.input.lightBorderFocused },
    containerError: { borderColor: colors.status.errorOnLight },
    containerDisabled: { opacity: 0.5 },
    prefix: { marginRight: 8 },
    leftIcon: { width: 16, alignItems: 'center', marginRight: 16 },
    // The 20pt indicator is centred where Figma's 16pt spinner sits (right edge 25pt from the field edge).
    spinner: { marginLeft: 8, marginRight: 6 },
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
