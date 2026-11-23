import React, { memo, type ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { DOCUMENT_KEYS, type DocumentKey } from '@/constants/onboarding';
import type { DocumentEntry } from '@/screens/onboarding/schemas/documents.schema';
import DocumentCard from './documents/DocumentCard';

export type DocumentsUploadListProps = {
  /** One entry (file and / or typed details) per document. */
  values: Record<DocumentKey, DocumentEntry>;
  onChange: (key: DocumentKey, entry: DocumentEntry) => void;
  /** Prefills the RC's registration number. */
  vehicleNumber?: string;
  /**
   * Rendered above the cards: onboarding's / My Documents' vehicle selector (it sits in the same
   * column of cards).
   */
  header?: ReactNode;
  /** Per document: "Add Manually" opens a screen instead of the details sheet. */
  onManual?: Partial<Record<DocumentKey, () => void>>;
  style?: StyleProp<ViewStyle>;
  testIDPrefix?: string;
};

/**
 * The vehicle document cards (RC, Insurance, Pollution (PUC), FASTag), with no screen header: onboarding
 * 3/3 and My Documents → "Upload documents". Fully controlled.
 */
function DocumentsUploadList({
  values,
  onChange,
  vehicleNumber,
  header,
  onManual,
  style,
  testIDPrefix = 'document',
}: DocumentsUploadListProps) {
  return (
    <View style={[styles.list, style]}>
      {header}
      {DOCUMENT_KEYS.map(key => (
        <DocumentCard
          key={key}
          testID={`${testIDPrefix}-${key}`}
          documentKey={key}
          entry={values[key]}
          vehicleNumber={vehicleNumber}
          onManual={onManual?.[key]}
          onChange={entry => onChange(key, entry)}
        />
      ))}
    </View>
  );
}

export default memo(DocumentsUploadList);

/* vehicle-documents-step.jpeg: 8pt between the white cards. */
const styles = StyleSheet.create({ list: { gap: 8 } });
