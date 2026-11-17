import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import OtpInput, { type OtpInputHandle } from '@/components/OtpInput';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import { strings } from '@/constants/strings';
import { useCountdown } from '@/hooks/useCountdown';
import { resetToHome } from '@/navigation/actions';
import type { AuthStackScreenProps } from '@/navigation/types';
import { AuthError, authService } from '@/services/auth';
import { haptics } from '@/services/haptics';
import { useScale } from '@/utils/scale';
import { formatCountdown, isValidOtp, maskPhone, OTP_LENGTH } from '@/utils/validation';

const t = strings.verifyOtp;
const RESEND_SECONDS = 30;

/** Vertical gaps measured from design/verify-otp.png. */
const GAP = { title: 38.4, description: 14.7, label: 57.5, boxes: 6.4, resend: 21, button: 46 };

export default function VerifyOtpScreen({ navigation, route }: AuthStackScreenProps<'VerifyOtp'>) {
  const { phone } = route.params;
  const { vs } = useScale();
  const otpRef = useRef<OtpInputHandle>(null);
  const buttonRef = useRef<ViewRef>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<{ message: string; wrongCode: boolean }>();
  const [loading, setLoading] = useState(false);
  const { remaining, isDone, restart } = useCountdown(RESEND_SECONDS);

  const onChangeCode = (value: string) => {
    setCode(value);
    setError(undefined);
  };

  const onConfirm = async () => {
    if (!isValidOtp(code)) {
      setError({ message: t.incompleteCode, wrongCode: false });
      haptics.error();
      otpRef.current?.focus();
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(phone, code);
      resetToHome(navigation);
    } catch (e) {
      setLoading(false);
      const wrongCode = e instanceof AuthError && e.code === 'INVALID_OTP';
      setError({ message: wrongCode ? t.invalidCode : strings.common.genericError, wrongCode });
      haptics.error();
      otpRef.current?.shake();
      // Clear via state, not otpRef.clear(): that fires onChange, which would wipe the error.
      setCode('');
      otpRef.current?.focus();
    }
  };

  const onResend = async () => {
    restart();
    setError(undefined);
    await authService.sendOtp(phone);
  };

  return (
    <ScreenContainer designTop={60} keyboardAnchorRef={buttonRef}>
      <BackButton />
      <AppText
        variant="screenTitle"
        style={{ marginTop: vs(GAP.title) }}
        accessibilityRole="header"
      >
        {t.title}
      </AppText>
      <AppText
        variant="bodyLarge"
        color="text.secondary"
        style={{ marginTop: vs(GAP.description) }}
      >
        {t.description(maskPhone(phone))}
      </AppText>

      <AppText variant="label" style={{ marginTop: vs(GAP.label) }} importantForAccessibility="no">
        {t.codeLabel}
      </AppText>
      <OtpInput
        ref={otpRef}
        style={{ marginTop: vs(GAP.boxes) }}
        value={code}
        onChange={onChangeCode}
        length={OTP_LENGTH}
        error={!!error?.wrongCode}
      />
      {!!error && (
        <AppText
          variant="error"
          color="status.error"
          style={styles.error}
          accessibilityLiveRegion="polite"
        >
          {error.message}
        </AppText>
      )}

      <View style={[styles.resendRow, { marginTop: vs(GAP.resend) }]}>
        {isDone ? (
          <Pressable
            onPress={onResend}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t.resend}
          >
            <AppText variant="captionStrong" color="text.link">
              {t.resend}
            </AppText>
          </Pressable>
        ) : (
          <AppText variant="caption" accessibilityLabel={`${t.resendIn} ${remaining} seconds`}>
            {`${t.resendIn} `}
            <AppText variant="captionStrong" color="text.link">
              {formatCountdown(remaining)}
            </AppText>
          </AppText>
        )}
      </View>

      <View ref={buttonRef} collapsable={false} style={{ marginTop: vs(GAP.button) }}>
        <PrimaryButton label={t.submit} onPress={onConfirm} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: 8 },
  resendRow: { flexDirection: 'row', justifyContent: 'center' },
});
