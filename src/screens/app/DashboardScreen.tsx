import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import Logo from '@/components/Logo';
import PrimaryButton from '@/components/PrimaryButton';
import ScreenContainer from '@/components/ScreenContainer';
import { strings } from '@/constants/strings';
import { useBootstrap } from '@/hooks/api/useBootstrap';
import { useAuthStore } from '@/store/auth.store';
import { useThemedStyles, type Theme } from '@/theme';
import { mask } from '@/utils/phone';
import { useScale } from '@/utils/scale';

const t = strings.dashboard;

/** Placeholder home: who is signed in + log out. Widgets/menus come in a later phase. */
export default function DashboardScreen() {
  const { vs } = useScale();
  const styles = useThemedStyles(makeStyles);
  const storeUser = useAuthStore(st => st.user);
  const signOut = useAuthStore(st => st.signOut);
  // Fresh data when cached (filled at sign-in); refetches after an offline start.
  const { data } = useBootstrap(storeUser?.id);
  const user = data ?? storeUser;
  const [signingOut, setSigningOut] = useState(false);

  const roles = user?.roles.length ? user.roles.join(', ') : t.noRole;

  return (
    <ScreenContainer designTop={104}>
      <Logo />
      <AppText
        testID="welcome"
        variant="screenTitle"
        style={[styles.center, { marginTop: vs(62.4) }]}
        accessibilityRole="header"
      >
        {t.welcome(user?.fullName || t.fallbackName)}
      </AppText>

      <View style={[styles.card, { marginTop: vs(40) }]}>
        <View style={styles.row}>
          <AppText variant="subtitle" color="text.secondary">
            {t.phoneLabel}
          </AppText>
          <AppText testID="masked-phone" variant="label">
            {user?.phone ? mask(user.phone) : '–'}
          </AppText>
        </View>
        <View style={styles.row}>
          <AppText variant="subtitle" color="text.secondary">
            {t.rolesLabel}
          </AppText>
          <AppText testID="roles" variant="label" style={styles.capitalize}>
            {roles}
          </AppText>
        </View>
      </View>

      <PrimaryButton
        style={{ marginTop: vs(40) }}
        label={t.logout}
        showArrow={false}
        loading={signingOut}
        onPress={() => {
          setSigningOut(true);
          // The store flips to signedOut immediately; RootNavigator swaps to the auth flow.
          signOut();
        }}
      />
    </ScreenContainer>
  );
}

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    center: { textAlign: 'center' },
    card: {
      borderRadius: radius.card,
      backgroundColor: colors.surface.card,
      borderWidth: 1,
      borderColor: colors.surface.cardBorder,
      padding: spacing.lg,
      gap: spacing.md,
    },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    capitalize: { textTransform: 'capitalize' },
  });
