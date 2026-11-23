import React from 'react';
import { StyleSheet } from 'react-native';
import AppText from '@/components/AppText';
import BottomSheet from '@/components/BottomSheet';
import type { DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';

const d = strings.onboarding.documents;

/** The (i) on a document card: what the document is and why we ask for it. */
export default function DocumentInfoSheet({
  visible,
  documentKey,
  onClose,
}: {
  visible: boolean;
  documentKey: DocumentKey;
  onClose: () => void;
}) {
  const card = d.cards[documentKey];
  return (
    <BottomSheet testID={`document-${documentKey}-info-sheet`} visible={visible} onClose={onClose} title={card.title}>
      <AppText variant="body" color="text.onLight" style={styles.body}>
        {card.info}
      </AppText>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({ body: { marginTop: 8, marginBottom: 16 } });
