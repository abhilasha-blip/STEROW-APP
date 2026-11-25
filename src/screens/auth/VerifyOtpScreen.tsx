import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { toUserError } from '@/api/errorMessages';
import AppText from '@/components/AppText';
import BackButton from '@/components/BackButton';
import OtpInput, { type OtpInputHandle } from '@/components/OtpInput';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import { useToast } from '@/components/Toast';
import { OTP_LENGTH, RESEND_COOLDOWN_S } from '@/constants/auth';
import { strings } from '@/constants/strings';
import { useRequestOtp } from '@/hooks/api/useRequestOtp';
import { useVerifyOtp } from '@/hooks/api/useVerifyOtp';
import { useCountdown } from '@/hooks/useCountdown';
import type { AuthStackScreenProps } from '@/navigation/types';
import { haptics } from '@/services/haptics';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';
import { mask } from '@/utils/phone';
import { useScale } from '@/utils/scale';
import { formatCountdown, isValidOtp } from '@/utils/validation';

const t = strings.verifyOtp;

/** Vertical gaps measured from design/verify-otp.png. */
const GAP = { title: 38.4, description: 14.7, label: 57.5, boxes: 6.4, resend: 21, button: 46 };
/** The Figma gap is sized for 4 boxes; 6 boxes use half of it so they fit the same width. */
const OTP_GAP_DIVISOR = OTP_LENGTH > 4 ? 2 : 1;

type ErrorState = { message: string; wrongCode: boolean };

export default function VerifyOtpScreen({ route }: AuthStackScreenProps<'VerifyOtp'>) {
  const { mode, country, phone, fullName, referralCode } = route.params;
  const { s, vs } = useScale();
  const { sizes } = useTheme();
  const toast = useToast();
  const otpRef = useRef<OtpInputHandle>(null);
  const buttonRef = useRef<ViewRef>(null);

  /** Always verify with the newest requestId (a resend invalidates the previous one). */
  const [requestId, setRequestId] = useState(route.params.requestId);
  const [code, setCode] = useState('');
  const [error, setError] = useState<ErrorState>();
  /** Too many wrong codes: the boxes stay cleared and disabled until a new OTP is sent. */
  const [locked, setLocked] = useState(false);
  /** Verified; the auth store is loading the user. Keep the button busy until the stack switches. */
  const [awaitingBootstrap, setAwaitingBootstrap] = useState(false);
  const { remaining, isDone, restart, finish } = useCountdown(RESEND_COOLDOWN_S);

  const verify = useVerifyOtp();
  const resend = useRequestOtp();
  const notice = useAuthStore(st => st.notice);

  // A bootstrap failure after verification surfaces as a store notice: stop the spinner.
  useEffect(() => {
    if (awaitingBootstrap && notice) {
      setAwaitingBootstrap(false);
    }
  }, [awaitingBootstrap, notice]);

  const showCodeError = (message: string) => {
    setError({ message, wrongCode: true });
    haptics.error();
    otpRef.current?.shake();
    // Clear via state, not otpRef.clear(): that fires onChange, which would wipe the error.
    setCode('');
    otpRef.current?.focus();
  };

  /** Too many wrong codes: message (toast + inline), clear + disable the boxes, Resend available now. */
  const lockCode = (message: string) => {
    setLocked(true);
    setCode('');
    setError({ message, wrongCode: true });
    haptics.error();
    otpRef.current?.shake();
    toast.error(message);
    // Resend now; if the server's 30 s request cooldown still applies it answers "wait…" and the
    // countdown restarts (onResend's WAIT_COOLDOWN), the lock message stays.
    finish();
  };

  const submit = (value: string) => {
    if (verify.isPending || resend.isPending || awaitingBootstrap || locked) {
      return;
    }
    if (!isValidOtp(value)) {
      setError({ message: t.incompleteCode, wrongCode: false });
      haptics.error();
      otpRef.current?.focus();
      return;
    }
    verify.mutate(
      { requestId, otp: value, purpose: mode },
      {
        onSuccess: () => {
          haptics.success();
          setAwaitingBootstrap(true);
        },
        onError: err => {
          const e = toUserError(err, 'otpVerify');
          if (e.kind === 'cancelled') {
            return;
          }
          if (e.action === 'OTP_LOCKED') {
            lockCode(e.userMessage);
          } else if (e.action === 'RESEND_OTP') {
            finish(); // expired: offer Resend immediately
            showCodeError(e.userMessage);
          } else if (e.field === 'otp') {
            showCodeError(e.userMessage);
          } else {
            haptics.error();
            toast.error(e.userMessage);
          }
        },
      },
    );
  };

  const onChangeCode = (value: string) => {
    setCode(value);
    setError(undefined);
    if (value.length === OTP_LENGTH) {
      submit(value);
    }
  };

  const onResend = () => {
    if (resend.isPending || verify.isPending) {
      return;
    }
    if (!locked) {
      setError(undefined);
    }
    resend.mutate(
      { country, phone, purpose: mode, fullName, referralCode },
      {
        onSuccess: res => {
          setRequestId(res.requestId);
          setCode('');
          setLocked(false); // a new code: the boxes work again
          setError(undefined);
          restart();
          toast.success(t.resent);
          otpRef.current?.focus();
        },
        onError: err => {
          const e = toUserError(err, 'otpRequest');
          if (e.kind === 'cancelled') {
            return;
          }
          haptics.error();
          toast.error(e.userMessage);
          if (e.action === 'WAIT_COOLDOWN') {
            restart();
          } else if (e.action === 'TOO_MANY_REQUESTS') {
            setError({ message: e.userMessage, wrongCode: false });
          }
        },
      },
    );
  };

  const busy = verify.isPending || awaitingBootstrap;

  return (
    <ScreenContainer designTop={60} keyboardAnchorRef={buttonRef}>
      <BackButton />
      <AppText variant="screenTitle" style={{ marginTop: vs(GAP.title) }} accessibilityRole="header">
        {t.title}
      </AppText>
      <AppText variant="bodyLarge" color="text.secondary" style={{ marginTop: vs(GAP.description) }}>
        {t.description(mask(country, phone))}
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
        gap={s(sizes.otpGap / OTP_GAP_DIVISOR)}
        error={!!error?.wrongCode}
        disabled={locked}
      />
      {!!error && (
        <AppText
          testID="otp-error"
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
            testID="resend"
            onPress={onResend}
            disabled={resend.isPending}
            hitSlop={{ top: 12, bottom: 12, left: 16, right: 16 }}
            accessibilityRole="button"
            accessibilityLabel={t.resend}
            accessibilityState={{ busy: resend.isPending, disabled: resend.isPending }}
          >
            <AppText variant="captionStrong" color="text.link">
              {t.resend}
            </AppText>
          </Pressable>
        ) : (
          <AppText testID="resend-countdown" variant="caption" accessibilityLabel={t.resendInA11y(remaining)}>
            {`${t.resendIn} `}
            <AppText variant="captionStrong" color="text.link">
              {formatCountdown(remaining)}
            </AppText>
          </AppText>
        )}
      </View>

      <View ref={buttonRef} collapsable={false} style={{ marginTop: vs(GAP.button) }}>
        <PrimaryButton label={t.submit} onPress={() => submit(code)} loading={busy} disabled={locked} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  error: { marginTop: 8 },
  resendRow: { flexDirection: 'row', justifyContent: 'center' },
});
