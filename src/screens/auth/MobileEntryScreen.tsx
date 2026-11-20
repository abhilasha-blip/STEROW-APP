import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import AppText from '@/components/AppText';
import CountryPrefix from '@/components/CountryPrefix';
import CountrySheet from '@/components/CountrySheet';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import TextField from '@/components/TextField';
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
type TextInputRef = React.ComponentRef<typeof TextInput>;

/** Sign In and Create Account: one screen, two modes. Both send an OTP to the mobile number. */
export default function MobileEntryScreen({ navigation, route }: AuthStackScreenProps<'MobileEntry'>) {
  const { vs } = useScale();
  const toast = useToast();
  const buttonRef = useRef<ViewRef>(null);
  const phoneRef = useRef<TextInputRef>(null);
  const referralRef = useRef<TextInputRef>(null);

  const [mode, setMode] = useState<AuthMode>(route.params?.mode ?? 'signin');
  const [fullName, setFullName] = useState('');
  const [country, setCountry] = useState<CountryCode>(route.params?.country ?? DEFAULT_COUNTRY);
  const [countrySheetOpen, setCountrySheetOpen] = useState(false);
  /** Set once the user picks a country, so a late preference read never overrides that choice. */
  const countryTouched = useRef(!!route.params?.country);
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const requestOtp = useRequestOtp();
  const copy = t[mode];

  /** Updates maxLength/validation; a number that isn't valid for the new country is cleared. */
  const applyCountry = (next: CountryCode) => {
    setCountry(next);
    setPhone(prev => {
      const n = normalizeNational(next, prev);
      return isValidMobile(next, n) ? n : '';
    });
    setErrors(e => ({ ...e, phone: undefined }));
  };

  // Remembered country (default India). Skipped when the route or the user already chose one.
  useEffect(() => {
    let active = true;
    loadCountry().then(saved => {
      if (active && !countryTouched.current && saved !== DEFAULT_COUNTRY) {
        applyCountry(saved);
      }
    });
    return () => {
      active = false;
    };
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

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (mode === 'signup' && !isValidFullName(fullName)) {
      next.fullName = t.invalidFullName;
    }
    if (!isValidMobile(country, phone)) {
      next.phone = t.invalidMobile[country];
    }
    if (mode === 'signup' && !isValidReferralCode(referralCode)) {
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
      phone,
      purpose: submittedMode,
      fullName: signup ? fullName : undefined,
      referralCode: signup && referralCode ? referralCode : undefined,
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
          switchMode('signin');
        } else if (e.action === 'GO_SIGN_UP') {
          switchMode('signup');
        }
      },
    });
  };

  const isSignup = mode === 'signup';
  const { length: phoneLength, stripTrunkZero } = COUNTRIES[country];

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
        <TextField
          testID="full-name"
          style={{ marginTop: vs(GAP.field) }}
          label={t.fullNameLabel}
          placeholder={t.fullNamePlaceholder}
          value={fullName}
          onChangeText={v => {
            setFullName(v);
            setErrors(e => ({ ...e, fullName: undefined }));
          }}
          autoCapitalize="words"
          autoCorrect={false}
          textContentType="name"
          autoComplete="name"
          returnKeyType="next"
          onSubmitEditing={() => phoneRef.current?.focus()}
          submitBehavior="submit"
          error={errors.fullName}
        />
      )}

      <TextField
        ref={phoneRef}
        testID="phone"
        style={{ marginTop: vs(isSignup ? GAP.nextField : GAP.field) }}
        label={t.mobileLabel}
        prefix={
          <CountryPrefix
            country={country}
            onPress={() => setCountrySheetOpen(true)}
            disabled={requestOtp.isPending}
          />
        }
        inputVariant="inputLarge"
        paddingStart={16}
        placeholder={t.mobilePlaceholder}
        value={phone}
        onChangeText={v => {
          setPhone(normalizeNational(country, v));
          setErrors(e => ({ ...e, phone: undefined }));
        }}
        keyboardType="phone-pad"
        // +1 lets a UAE number be typed with its trunk 0 ("050…"); normalizeNational strips it.
        maxLength={phoneLength + (stripTrunkZero ? 1 : 0)}
        textContentType="telephoneNumber"
        autoComplete="tel"
        returnKeyType={isSignup ? 'next' : 'done'}
        onSubmitEditing={isSignup ? () => referralRef.current?.focus() : onSubmit}
        error={errors.phone}
      />

      {isSignup && (
        <TextField
          ref={referralRef}
          testID="referral"
          style={{ marginTop: vs(GAP.nextField) }}
          label={t.referralLabel}
          placeholder={t.referralPlaceholder}
          value={referralCode}
          onChangeText={v => {
            setReferralCode(normalizeReferralCode(v));
            setErrors(e => ({ ...e, referralCode: undefined }));
          }}
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
        onClose={() => setCountrySheetOpen(false)}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
