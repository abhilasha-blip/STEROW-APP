import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import AppText from '@/components/AppText';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import TextField from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { MOBILE_LENGTH, REFERRAL_MAX } from '@/constants/auth';
import { strings } from '@/constants/strings';
import { useRequestOtp } from '@/hooks/api/useRequestOtp';
import type { AuthMode, AuthStackScreenProps } from '@/navigation/types';
import { haptics } from '@/services/haptics';
import { useScale } from '@/utils/scale';
import {
  digitsOnly,
  isValidFullName,
  isValidIndianMobile,
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
  const [phone, setPhone] = useState(route.params?.phone ?? '');
  const [referralCode, setReferralCode] = useState('');
  const [errors, setErrors] = useState<FieldErrors>({});
  const requestOtp = useRequestOtp();
  const copy = t[mode];

  const switchMode = (next: AuthMode) => {
    setMode(next);
    setErrors({});
  };

  const validate = (): FieldErrors => {
    const next: FieldErrors = {};
    if (mode === 'signup' && !isValidFullName(fullName)) {
      next.fullName = t.invalidFullName;
    }
    if (!isValidIndianMobile(phone)) {
      next.phone = t.invalidMobile;
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
          setErrors({ phone: e.userMessage });
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
        prefix={t.countryCode}
        inputVariant="inputLarge"
        paddingStart={16}
        placeholder={t.mobilePlaceholder}
        value={phone}
        onChangeText={v => {
          setPhone(digitsOnly(v).slice(0, MOBILE_LENGTH));
          setErrors(e => ({ ...e, phone: undefined }));
        }}
        keyboardType="phone-pad"
        maxLength={MOBILE_LENGTH}
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
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
