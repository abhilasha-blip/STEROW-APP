import React, { memo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { DOCUMENT_KEYS, type DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import type { DocumentsFormValues } from '@/screens/onboarding/schemas/documents.schema';
import type { UploadedFile } from '@/utils/uploadFile';
import FileUploadCard from './FileUploadCard';

const d = strings.onboarding.documents;

export const DOCUMENT_CARDS: Record<DocumentKey, { label: string; title: string }> = {
  rc: { label: d.rcLabel, title: d.rcTitle },
  insurance: { label: d.insuranceLabel, title: d.insuranceTitle },
  pollution: { label: d.pollutionLabel, title: d.pollutionTitle },
};

export type DocumentsUploadListProps = {
  values: DocumentsFormValues;
  onChange: (key: DocumentKey, file: UploadedFile | null) => void;
  /** Applied to the first card (e.g. the onboarding sheet's first-label offset). */
  style?: StyleProp<ViewStyle>;
  testIDPrefix?: string;
};

/**
 * The vehicle document upload cards (RC, Insurance, Pollution Certificate), with no screen header:
 * used by onboarding step 3 and reusable on the Dashboard. Fully controlled.
 */
function DocumentsUploadList({ values, onChange, style, testIDPrefix = 'document' }: DocumentsUploadListProps) {
  return (
    <View style={style}>
      {DOCUMENT_KEYS.map((key, index) => (
        <FileUploadCard
          key={key}
          testID={`${testIDPrefix}-${key}`}
          style={index > 0 ? styles.card : undefined}
          label={DOCUMENT_CARDS[key].label}
          title={DOCUMENT_CARDS[key].title}
          value={values[key]}
          onChange={file => onChange(key, file)}
        />
      ))}
    </View>
  );
}

export default memo(DocumentsUploadList);

const styles = StyleSheet.create({
  // Card bottom → next label's line box: 55pt between boxes − 18 (label) − 8 (label gap).
  card: { marginTop: 29 },
});
