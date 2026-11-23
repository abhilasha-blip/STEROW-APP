import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import LightScreen from '@/components/LightScreen';
import { strings } from '@/constants/strings';

/** Placeholder for features without a design / API yet (tabs, drawer rows, tiles). */
export default function ComingSoonScreen({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <LightScreen testID="coming-soon" title={title} onBack={onBack} aboveTabs>
      <View style={styles.body}>
        <AppText variant="sectionTitleSmall" color="text.onLight">
          {strings.comingSoon.title}
        </AppText>
        <AppText variant="body" color="text.onLightMuted" style={styles.text}>
          {strings.comingSoon.body}
        </AppText>
      </View>
    </LightScreen>
  );
}

const styles = StyleSheet.create({
  body: { marginTop: 40, alignItems: 'center' },
  text: { marginTop: 8, textAlign: 'center' },
});
