import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import AppText from '@/components/AppText';
import BufferedTextField, { type BufferedTextFieldHandle } from '@/components/BufferedTextField';
import CountryPrefix from '@/components/CountryPrefix';
import CountrySheet from '@/components/CountrySheet';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import { useToast } from '@/components/Toast';
import { REFERRAL_MAX } from '@/constants/auth';
import { COUNTRIES, DEFAULT_COUNTRY, type CountryCode } from '@/constants/countries';
import { strings } from '@/constants/strings';
import { useRequestOtp } from '@/hooks/api/useRequestOtp';
import type { AuthMode, AuthStackScreenProps } from '@/navigation/types';
import { haptics } from '@/services/haptics';
import { loadCountry, saveCountry } from '@/storage/countryPreference';
import { isValidMobile, normalizeNational } from '@/utils/phone';
import { useScale } from '@/utils/scale';
import {
  isValidFullName,
  isValidReferralCode,
  normalizeReferralCode,
} from '@/utils/validation';

const t = strings.mobileEntry;

/** Vertical gaps measured from design/create-account.png and sign-in.png. */
const GAP = { title: 62.4, subtitle: 14.7, field: 42.5, nextField: 24, button: 40, footer: 29.2 };

type FieldErrors = { fullName?: string; phone?: string; referralCode?: string };

/**
 * Sign In and Create Account: one screen, two modes. Both send an OTP to the mobile number.
 *
 * Performance: the text fields own their text (BufferedTextField) and report it into refs, so a
 * keystroke re-renders only that field – not this screen, its full-screen SVG background, the logo,
 * the button or the country sheet. The screen re-renders on a keystroke only to clear a shown error.
 */
export default function MobileEntryScreen({ navigation, route }: AuthStackScreenProps<'MobileEntry'>) {
  const { vs } = useScale();
  const toast = useToast();
  const buttonRef = useRef<ViewRef>(null);
  const fullNameField = useRef<BufferedTextFieldHandle>(null);
  const phoneField = useRef<BufferedTextFieldHandle>(null);
  const referralField = useRef<BufferedTextFieldHandle>(null);

  const [mode, setMode] = useState<AuthMode>(route.params?.mode ?? 'signin');
  const [country, setCountry] = useState<CountryCode>(route.params?.country ?? DEFAULT_COUNTRY);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  /** Set once the user picks a country, so a late preference read never overrides that choice. */
  const countryTouched = useRef(!!route.params?.country);
  /** Latest field values. Written by the fields on every keystroke without re-rendering the screen. */
  const fullName = useRef('');
  const phone = useRef(normalizeNational(country, route.params?.phone ?? ''));
  const referralCode = useRef('');
  const [errors, setErrorsState] = useState<FieldErrors>({});
  const errorsRef = useRef(errors);
  const requestOtp = useRequestOtp();
  const copy = t[mode];

  const setErrors = useCallback((next: FieldErrors) => {
    errorsRef.current = next;
    setErrorsState(next);
  }, []);

  /** Typing clears that field's error; a no-op (no render) when none is shown. */
  const clearError = useCallback(
    (field: keyof FieldErrors) => {
      if (errorsRef.current[field]) {
        setErrors({ ...errorsRef.current, [field]: undefined });
      }
    },
    [setErrors],
  );

  const onFullNameChange = useCallback(
    (v: string) => {
      fullName.current = v;
      clearError('fullName');
    },
    [clearError],
  );
  const onPhoneChange = useCallback(
    (v: string) => {
      phone.current = v;
      clearError('phone');
    },
    [clearError],
  );
  const onReferralChange = useCallback(
    (v: string) => {
      referralCode.current = v;
      clearError('referralCode');
    },
    [clearError],
  );
  const formatPhone = useCallback((v: string) => normalizeNational(country, v), [country]);

  /** Updates maxLength/validation; a number that isn't valid for the new country is cleared. */
  const applyCountry = (next: CountryCode) => {
    setCountry(next);
    const n = normalizeNational(next, phone.current);
    phone.current = isValidMobile(next, n) ? n : '';
    phoneField.current?.setValue(phone.current);
    clearError('phone');
  };

  // Remembered country (default India). Skipped when the route or the user already chose one, or once
  // the user has started typing: the Keychain read can land after the first keystrokes, and switching
  // country then would clear a number that isn't (yet) valid for it. Only an explicit pick resets it.
  useEffect(() => {
    let active = true;
    loadCountry().then(saved => {
      if (active && !countryTouched.current && !phone.current && saved !== DEFAULT_COUNTRY) {
        applyCountry(saved);
      }
    });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on mount
  }, []);

  const onSelectCountry = (next: CountryCode) => {
    countryTouched.current = true;
    setCountrySheetOpen(false);
    if (next !== country) {
      haptics.light();
      applyCountry(next);
      saveCountry(next);
    }
  };

  /**
   * Sign In ⇄ Sign Up. The footer link starts the other form empty (name, referral, phone, errors). The
   * automatic switch after "already registered" / "no account found" keeps only the phone number.
   * (The name / referral fields re-mount on Sign Up and read these refs as their initial value.)
   */
  const switchMode = (next: AuthMode, { keepPhone = false }: { keepPhone?: boolean } = {}) => {
    fullName.current = '';
    referralCode.current = '';
    if (!keepPhone) {
      phone.current = '';
      phoneField.current?.setValue('');
    }
    setMode(next);
    setErrors({});
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (mode === 'signup' && !isValidFullName(fullName.current)) {
      next.fullName = t.invalidFullName;
    }
    if (!isValidMobile(country, phone.current)) {
      next.phone = t.invalidMobile[country];
    }
    if (mode === 'signup' && !isValidReferralCode(referralCode.current)) {
      next.referralCode = t.invalidReferral;
    }
    return next;
  };

  const onSubmit = () => {
    if (requestOtp.isPending) {
      return;
    }
    const fieldErrors = validate();
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length) {
      haptics.error();
      return;
    }
    const submittedMode = mode;
    const signup = submittedMode === 'signup';
    const input = {
      country,
      phone: phone.current,
      purpose: submittedMode,
      fullName: signup ? fullName.current : undefined,
      referralCode: signup && referralCode.current ? referralCode.current : undefined,
    };
    requestOtp.mutate(input, {
      onSuccess: ({ requestId }) => {
        toast.success(t[submittedMode].otpSent);
        navigation.navigate('VerifyOtp', { mode: submittedMode, requestId, ...input });
      },
      onError: error => {
        const e = toUserError(error);
        if (e.kind === 'cancelled') {
          return;
        }
        haptics.error();
        if (e.field === 'phone') {
          setErrors({ phone: t.invalidMobile[country] });
          return;
        }
        toast.error(e.userMessage);
        if (e.action === 'GO_SIGN_IN') {
          switchMode('signin', { keepPhone: true });
        } else if (e.action === 'GO_SIGN_UP') {
          switchMode('signup', { keepPhone: true });
        }
      },
    });
  };

  const isSignup = mode === 'signup';
  const { length: phoneLength, stripTrunkZero } = COUNTRIES[country];
  const openCountrySheet = useCallback(() => setCountrySheetOpen(true), []);
  const closeCountrySheet = useCallback(() => setCountrySheetOpen(false), []);
  const countryPrefix = useMemo(
    () => <CountryPrefix country={country} onPress={openCountrySheet} disabled={requestOtp.isPending} />,
    [country, openCountrySheet, requestOtp.isPending],
  );
  const focusPhone = useCallback(() => phoneField.current?.focus(), []);
  const focusReferral = useCallback(() => referralField.current?.focus(), []);

  return (
    <ScreenContainer car designTop={104} keyboardAnchorRef={buttonRef}>
      <Logo />
      <AppText
        variant="screenTitle"
        style={[styles.center, { marginTop: vs(GAP.title) }]}
        accessibilityRole="header"
      >
        {copy.title}
      </AppText>
      <AppText
        variant="bodyLarge"
        color="text.secondary"
        style={[styles.center, { marginTop: vs(GAP.subtitle) }]}
      >
        {copy.subtitle}
      </AppText>

      {isSignup && (
        <BufferedTextField
          ref={fullNameField}
          testID="full-name"
          style={{ marginTop: vs(GAP.field) }}
          label={t.fullNameLabel}
          placeholder={t.fullNamePlaceholder}
          initialValue={fullName.current}
          onValueChange={onFullNameChange}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={focusPhone}
          submitBehavior="submit"
          error={errors.fullName}
        />
      )}

      <BufferedTextField
        ref={phoneField}
        testID="phone"
        style={{ marginTop: vs(isSignup ? GAP.nextField : GAP.field) }}
        label={t.mobileLabel}
        prefix={countryPrefix}
        inputVariant="inputLarge"
        paddingStart={16}
        placeholder={t.mobilePlaceholder}
        initialValue={phone.current}
        format={formatPhone}
        onValueChange={onPhoneChange}
        keyboardType="phone-pad"
        // +1 lets a UAE number be typed with its trunk 0 ("050…"); normalizeNational strips it.
        maxLength={phoneLength + (stripTrunkZero ? 1 : 0)}
        textContentType="telephoneNumber"
        autoComplete="tel"
        returnKeyType={isSignup ? 'next' : 'done'}
        onSubmitEditing={isSignup ? focusReferral : onSubmit}
        error={errors.phone}
      />

      {isSignup && (
        <BufferedTextField
          ref={referralField}
          testID="referral"
          style={{ marginTop: vs(GAP.nextField) }}
          label={t.referralLabel}
          placeholder={t.referralPlaceholder}
          initialValue={referralCode.current}
          format={normalizeReferralCode}
          onValueChange={onReferralChange}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={REFERRAL_MAX}
          returnKeyType="done"
          onSubmitEditing={onSubmit}
          error={errors.referralCode}
        />
      )}

      <View ref={buttonRef} collapsable={false} style={{ marginTop: vs(GAP.button) }}>
        <PrimaryButton label={t.submit} onPress={onSubmit} loading={requestOtp.isPending} />
      </View>

      <View style={[styles.footer, { marginTop: vs(GAP.footer) }]}>
        <AppText variant="small">{`${copy.footerPrompt} `}</AppText>
        <Pressable
          testID="switch-mode"
          onPress={() => switchMode(isSignup ? 'signin' : 'signup')}
          disabled={requestOtp.isPending}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
          accessibilityRole="link"
          accessibilityLabel={copy.footerLink}
        >
          <AppText variant="smallStrong" color="text.link">
            {copy.footerLink}
          </AppText>
        </Pressable>
      </View>

      <CountrySheet
        visible={countrySheetOpen}
        selected={country}
        onSelect={onSelectCountry}
        onClose={closeCountrySheet}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
