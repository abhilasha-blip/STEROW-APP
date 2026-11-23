import React, { useState } from 'react';
import { StyleSheet } from 'react-native';
import AppText from '@/components/AppText';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer from '@/components/ScreenContainer';
import { strings } from '@/constants/strings';
import { useAuthStore } from '@/store/auth.store';
import { useScale } from '@/utils/scale';

const t = strings.dashboard;

/**
 * PLACEHOLDER User Dashboard (the Figma design follows): a title and Log out. Reached after
 * onboarding, by "Skip for now" on step 2, or at launch once onboarding is done / skipped.
 */
export default function DashboardScreen() {
  const { vs } = useScale();
  const signOut = useAuthStore(st => st.signOut);
  const [signingOut, setSigningOut] = useState(false);

  return (
    <ScreenContainer designTop={104}>
      <Logo />
      <AppText
        testID="dashboard"
        variant="screenTitle"
        style={[styles.center, { marginTop: vs(62.4) }]}
        accessibilityRole="header"
      >
        {t.title}
      </AppText>
      <AppText
        variant="subtitle"
        color="text.secondary"
        style={[styles.center, { marginTop: vs(8) }]}
      >
        {t.placeholder}
      </AppText>

      <PrimaryButton
        style={{ marginTop: vs(40) }}
        label={t.logout}
        showArrow={false}
        loading={signingOut}
        disabled={signingOut}
        onPress={() => {
          setSigningOut(true);
          // The store flips to signedOut immediately; RootNavigator swaps to the auth flow.
          signOut();
        }}
      />
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
