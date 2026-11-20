import React from 'react';
import { StyleSheet } from 'react-native';
import AppText from '@/components/AppText';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer from '@/components/ScreenContainer';
import { strings } from '@/constants/strings';

const c = strings.onboarding.complete;

/** Placeholder end of onboarding (not designed yet): a title and a way back to the Dashboard. */
export default function OnboardingCompleteScreen({ onDone }: { onDone: () => void }) {
  return (
    <ScreenContainer designTop={104}>
      <Logo />
      <AppText testID="onboarding-complete" variant="screenTitle" style={styles.title} accessibilityRole="header">
        {c.title}
      </AppText>
      <PrimaryButton
        testID="onboarding-complete-done"
        style={styles.button}
        label={c.toDashboard}
        labelVariant="buttonStrong"
        onPress={onDone}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  title: { marginTop: 62, textAlign: 'center' },
  button: { marginTop: 40 },
});
