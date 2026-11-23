import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { DrawerContentComponentProps } from '@react-navigation/drawer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Logout from '@/assets/icons/dashboard/logout.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useAuthStore } from '@/store/auth.store';
import { useTheme } from '@/theme';

/** Side drawer content (Part 3 builds the full side-drawer.svg). */
export default function DrawerContent(_: DrawerContentComponentProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const signOut = useAuthStore(s => s.signOut);
  return (
    <View testID="drawer" style={[styles.root, { paddingTop: insets.top + 24 }]}>
      <Pressable testID="drawer-logout" onPress={() => signOut()} accessibilityRole="button" style={styles.row}>
        <Logout width={24} height={24} color={colors.dashboard.drawerLogout} />
        <AppText variant="drawerRow" color="dashboard.drawerLogout">
          {strings.drawer.logout}
        </AppText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, paddingHorizontal: 24 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingVertical: 18 },
});
