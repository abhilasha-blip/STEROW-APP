import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import AuthBackground from '@/components/AuthBackground';
import { strings } from '@/constants/strings';

/** Placeholder post-login destination – replaced by the real app later. */
export default function HomeScreen() {
  return (
    <View style={styles.root}>
      <AuthBackground />
      <AppText variant="screenTitle" accessibilityRole="header">
        {strings.home.title}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
