import React, { memo, type ReactNode } from 'react';
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
  fastag: { label: d.fastagLabel, title: d.fastagTitle },
};

export type DocumentsUploadListProps = {
  /** The attached file per card (other fields of the form are ignored here). */
  values: Pick<DocumentsFormValues, DocumentKey>;
  onChange: (key: DocumentKey, file: UploadedFile | null) => void;
  /** Applied to the first card (e.g. the onboarding sheet's first-label offset). */
  style?: StyleProp<ViewStyle>;
  testIDPrefix?: string;
  /**
   * Rendered above the cards: onboarding's Vehicle Number + Model, or the Dashboard's vehicle-selector
   * dropdown ("My Documents").
   */
  header?: ReactNode;
  /** Rendered under a card, e.g. its required number field(s) once a file is attached. */
  renderBelow?: (key: DocumentKey) => ReactNode;
};

/**
 * The vehicle document upload cards (RC, Insurance, Pollution Certificate, FASTag), with no screen header:
 * used by onboarding step 3 and reusable on the Dashboard. Fully controlled.
 */
function DocumentsUploadList({
  values,
  onChange,
  style,
  testIDPrefix = 'document',
  header,
  renderBelow,
}: DocumentsUploadListProps) {
  return (
    <View style={style}>
      {header}
      {DOCUMENT_KEYS.map((key, index) => (
        <View key={key} style={index > 0 ? styles.card : undefined}>
          <FileUploadCard
            testID={`${testIDPrefix}-${key}`}
            label={DOCUMENT_CARDS[key].label}
            title={DOCUMENT_CARDS[key].title}
            value={values[key]}
            onChange={file => onChange(key, file)}
          />
          {renderBelow?.(key)}
        </View>
      ))}
    </View>
  );
}

export default memo(DocumentsUploadList);

const styles = StyleSheet.create({
  // Card bottom → next label's line box: 55pt between boxes − 18 (label) − 8 (label gap).
  card: { marginTop: 29 },
});
