import 'react-native-url-polyfill/auto';
import React, { useMemo } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { bindOnlineManagerToNetInfo, queryClient } from '@/api/queryClient';
import AppEffects from '@/components/app/AppEffects';
import { ToastProvider } from '@/components/Toast';
import RootNavigator from '@/navigation/RootNavigator';
import { ThemeProvider, createNavigationTheme, useTheme } from '@/theme';

bindOnlineManagerToNetInfo();

/** DEV only: `-qaScenario <name>` opens a seeded onboarding step for screenshots (src/dev/QaOnboarding). */
const qa = __DEV__
  ? (require('@/dev/QaOnboarding') as typeof import('@/dev/QaOnboarding'))
  : null;
const qaScenario = qa?.getQaScenarioName() ?? null;

function ThemedNavigation() {
  const theme = useTheme();
  const navigationTheme = useMemo(() => createNavigationTheme(theme), [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      {/* RN 0.88: edge-to-edge is always on, so the status bar is already transparent/translucent. */}
      <StatusBar barStyle={theme.colors.statusBar} />
      <RootNavigator />
    </NavigationContainer>
  );
}

export default function App() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <SafeAreaProvider>
        <ThemeProvider>
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <AppEffects />
              {qa && qaScenario ? <qa.default name={qaScenario} /> : <ThemedNavigation />}
            </ToastProvider>
          </QueryClientProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
