import React, { useMemo } from 'react';
import { StatusBar, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import BootSplash from 'react-native-bootsplash';
import RootNavigator from '@/navigation/RootNavigator';
import { ThemeProvider, createNavigationTheme, useTheme } from '@/theme';

function ThemedNavigation() {
  const theme = useTheme();
  const navigationTheme = useMemo(() => createNavigationTheme(theme), [theme]);

  return (
    <NavigationContainer theme={navigationTheme} onReady={() => BootSplash.hide({ fade: true })}>
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
          <ThemedNavigation />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});
