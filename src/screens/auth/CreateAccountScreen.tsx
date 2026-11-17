import React, { useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer, { type ViewRef } from '@/components/ScreenContainer';
import TextField from '@/components/TextField';
import { strings } from '@/constants/strings';
import type { AuthStackScreenProps } from '@/navigation/types';
import { authService } from '@/services/auth';
import { haptics } from '@/services/haptics';
import { useScale } from '@/utils/scale';
import { digitsOnly, isValidIndianMobile, MOBILE_LENGTH } from '@/utils/validation';

const t = strings.createAccount;

/** Vertical gaps measured from design/create-account.png. */
const GAP = { title: 62.4, subtitle: 14.7, field: 42.5, button: 40 };

export default function CreateAccountScreen({ navigation }: AuthStackScreenProps<'CreateAccount'>) {
  const { vs } = useScale();
  const buttonRef = useRef<ViewRef>(null);
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);

  const onChangePhone = (value: string) => {
    setPhone(digitsOnly(value).slice(0, MOBILE_LENGTH));
    setError(undefined);
  };

  const onSubmit = async () => {
    if (!isValidIndianMobile(phone)) {
      setError(t.invalidMobile);
      haptics.error();
      return;
    }
    setLoading(true);
    try {
      await authService.sendOtp(phone);
      navigation.navigate('VerifyOtp', { phone });
    } catch {
      setError(strings.common.genericError);
    } finally {
      setLoading(false);
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
        variant="bodyLarge"
        color="text.secondary"
        style={[styles.center, { marginTop: vs(GAP.subtitle) }]}
      >
        {t.subtitle}
      </AppText>

      <TextField
        style={{ marginTop: vs(GAP.field) }}
        label={t.mobileLabel}
        prefix={t.countryCode}
        inputVariant="inputLarge"
        paddingStart={16}
        placeholder={t.mobilePlaceholder}
        value={phone}
        onChangeText={onChangePhone}
        keyboardType="phone-pad"
        maxLength={MOBILE_LENGTH}
        textContentType="telephoneNumber"
        autoComplete="tel"
        returnKeyType="done"
        onSubmitEditing={onSubmit}
        error={error}
      />

      <View ref={buttonRef} collapsable={false} style={{ marginTop: vs(GAP.button) }}>
        <PrimaryButton label={t.submit} onPress={onSubmit} loading={loading} />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
