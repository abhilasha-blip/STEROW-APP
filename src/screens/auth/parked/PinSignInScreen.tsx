import React, { useRef, useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import FaceIdIcon from '@/assets/icons/face-id.svg';
import FingerprintIcon from '@/assets/icons/fingerprint.svg';
import AppText from '@/components/AppText';
import BiometricButton from '@/components/BiometricButton';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import TextField from '@/components/TextField';
import { strings } from '@/constants/strings';
import { AuthError, authService } from '@/services/parkedPinAuth';
import { authenticateWithBiometrics } from '@/services/biometrics';
import { haptics } from '@/services/haptics';
import { useScale } from '@/utils/scale';
import { digitsOnly, isValidPin, PIN_MAX_LENGTH } from '@/utils/validation';

const t = strings.signIn;

/** Vertical gaps measured from design/sign-in.png (pt, 402 x 874 frame). */
const GAP = {
  title: 62.4,
  subtitle: 12.5,
  field: 43.5,
  button: 40,
  or: 37.2,
  biometrics: 22.8,
  footer: 29.2,
};

/**
 * PARKED (out of navigation, Phase B scope): PIN + Face ID / fingerprint sign-in.
 * The backend has no PIN or biometric endpoint yet (see docs/API_PLAN.md). Kept compiling and
 * navigation-agnostic so it can be wired back in later.
 */
type PinSignInScreenProps = { onSignUp?: () => void; onSignedIn?: () => void };

export default function PinSignInScreen({ onSignUp, onSignedIn }: PinSignInScreenProps) {
  const { s, vs } = useScale();
  const buttonRef = useRef<ViewRef>(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [biometricBusy, setBiometricBusy] = useState(false);

  const onChangePin = (value: string) => {
    setPin(digitsOnly(value).slice(0, PIN_MAX_LENGTH));
    setError(undefined);
  };

  const onSubmit = async () => {
    if (!isValidPin(pin)) {
      setError(t.invalidPin);
      haptics.error();
      return;
    }
    setLoading(true);
    try {
      await authService.loginWithPin(pin);
      onSignedIn?.();
    } catch (e) {
      setError(
        e instanceof AuthError && e.code === 'INVALID_PIN'
          ? t.incorrectPin
          : strings.common.genericError,
      );
      setLoading(false);
    }
  };

  const onBiometric = async () => {
    if (biometricBusy) {
      return;
    }
    setBiometricBusy(true);
    const result = await authenticateWithBiometrics(t.biometricPrompt);
    if (result.status === 'success') {
      await authService.loginWithBiometrics();
      onSignedIn?.();
      return;
    }
    setBiometricBusy(false);
    if (result.status === 'unavailable') {
      Alert.alert(t.biometricUnavailableTitle, t.biometricUnavailable);
    } else if (result.status === 'error') {
      Alert.alert(t.biometricUnavailableTitle, t.biometricFailed);
    }
  };

  return (
    <ScreenContainer car designTop={104} keyboardAnchorRef={buttonRef}>
      <Logo />
      <AppText
        variant="screenTitle"
        style={[styles.center, { marginTop: vs(GAP.title) }]}
        accessibilityRole="header"
      >
        {t.title}
      </AppText>
      <AppText
        variant="subtitle"
        color="text.secondary"
        numberOfLines={1}
        style={[styles.center, { marginTop: vs(GAP.subtitle) }]}
      >
        {t.subtitle}
      </AppText>

      <TextField
        style={{ marginTop: vs(GAP.field) }}
        label={t.pinLabel}
        placeholder={t.pinPlaceholder}
        value={pin}
        onChangeText={onChangePin}
        keyboardType="number-pad"
        secureTextEntry
        maxLength={PIN_MAX_LENGTH}
        textContentType="password"
        autoComplete="password"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        error={error}
      />

      <View ref={buttonRef} collapsable={false} style={{ marginTop: vs(GAP.button) }}>
        <PrimaryButton label={t.submit} onPress={onSubmit} loading={loading} />
      </View>

      <AppText variant="small" style={[styles.center, { marginTop: vs(GAP.or) }]}>
        {t.orLoginWith}
      </AppText>

      <View style={[styles.biometrics, { marginTop: vs(GAP.biometrics), gap: s(24) }]}>
        <BiometricButton
          icon={FaceIdIcon}
          label={t.faceId}
          onPress={onBiometric}
          disabled={biometricBusy}
        />
        <BiometricButton
          icon={FingerprintIcon}
          label={t.fingerprint}
          onPress={onBiometric}
          disabled={biometricBusy}
        />
      </View>

      <View style={[styles.footer, { marginTop: vs(GAP.footer) }]}>
        <AppText variant="small">{`${t.noAccount} `}</AppText>
        <Pressable
          onPress={() => onSignUp?.()}
          hitSlop={{ top: 12, bottom: 12, left: 8, right: 16 }}
          accessibilityRole="link"
          accessibilityLabel={t.signUp}
        >
          <AppText variant="smallStrong" color="text.link">
            {t.signUp}
          </AppText>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
  biometrics: { flexDirection: 'row' },
  footer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center' },
});
