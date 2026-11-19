import React, { type ReactElement } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { __resetAppClientForTests } from '@/api/appClient';
import { queryClient } from '@/api/queryClient';
import { __resetSupabaseForTests } from '@/api/supabase';
import AppEffects from '@/components/app/AppEffects';
import { ToastProvider } from '@/components/Toast';
import RootNavigator from '@/navigation/RootNavigator';
import { __resetAuthStoreForTests } from '@/store/auth.store';
import { ThemeProvider } from '@/theme';

export function resetAppState(): void {
  __resetAuthStoreForTests();
  __resetSupabaseForTests();
  __resetAppClientForTests();
  queryClient.clear();
}

export function Providers({ children }: { children: ReactElement }) {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>{children}</ToastProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

/** The real app tree (store-driven navigation, hydrate on mount), minus native-only bits. */
export async function renderApp() {
  return await render(
    <Providers>
      <>
        <AppEffects />
        <NavigationContainer>
          <RootNavigator />
        </NavigationContainer>
      </>
    </Providers>,
  );
}
