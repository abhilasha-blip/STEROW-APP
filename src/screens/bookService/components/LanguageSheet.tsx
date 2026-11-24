import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import AppText from '@/components/AppText';
import BottomSheet from '@/components/BottomSheet';
import { strings } from '@/constants/strings';
import type { VoiceLanguage } from '@/services/bookingService';
import SelectionIndicator from './SelectionIndicator';

type Props = {
  visible: boolean;
  languages: readonly VoiceLanguage[];
  value: string;
  onSelect: (code: string) => void;
  onClose: () => void;
};

/** Voice language picker (UI only: the stub recogniser ignores it). */
export default function LanguageSheet({ visible, languages, value, onSelect, onClose }: Props) {
  return (
    <BottomSheet visible={visible} onClose={onClose} title={strings.bookService.service.languageTitle} testID="language-sheet">
      <View style={styles.list} accessibilityRole="radiogroup">
        {languages.map(l => {
          const selected = l.code === value;
          return (
            <Pressable
              key={l.code}
              testID={`language-${l.code}`}
              accessibilityRole="radio"
              accessibilityLabel={l.label}
              accessibilityState={{ checked: selected }}
              onPress={() => {
                onSelect(l.code);
                onClose();
              }}
              style={styles.row}
            >
              <AppText variant="body" color="booking.text" style={styles.label}>
                {l.label}
              </AppText>
              <SelectionIndicator kind="radio" selected={selected} />
            </Pressable>
          );
        })}
      </View>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: 12, marginBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', minHeight: 48 },
  label: { flex: 1 },
});
