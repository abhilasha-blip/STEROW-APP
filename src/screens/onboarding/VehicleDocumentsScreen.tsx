import React from 'react';
import { StyleSheet } from 'react-native';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import FileUploadCard from '@/components/FileUploadCard';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import { DOCUMENT_KEYS, ONBOARDING_TOTAL_STEPS, type DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import type { UploadedFile } from '@/utils/uploadFile';
import {
  canProceedDocuments,
  documentsFieldsSchema,
  type DocumentsFormValues,
} from './schemas/documents.schema';
import { useFormMirror } from './useFormMirror';

const t = strings.onboarding;
const d = t.documents;

const CARDS: Record<DocumentKey, { label: string; title: string }> = {
  rc: { label: d.rcLabel, title: d.rcTitle },
  license: { label: d.licenseLabel, title: d.licenseTitle },
  insurance: { label: d.insuranceLabel, title: d.insuranceTitle },
  pollution: { label: d.pollutionLabel, title: d.pollutionTitle },
};

export type VehicleDocumentsScreenProps = {
  /** Prefilled: the RC from step 2 and the DL photo from step 1 (see resolveDocuments). */
  initialValues: DocumentsFormValues;
  onNext: (values: DocumentsFormValues) => void;
  onSkip: () => void;
  onBack?: () => void;
  /** Called with the document that changed (the store records it as chosen on this step). */
  onDocumentChange?: (key: DocumentKey, file: UploadedFile | null) => void;
};

/** Onboarding step 3 "Your Vehicle documents" (UI only). */
export default function VehicleDocumentsScreen({
  initialValues,
  onNext,
  onSkip,
  onBack,
  onDocumentChange,
}: VehicleDocumentsScreenProps) {
  const form = useForm<DocumentsFormValues>({
    resolver: zodResolver(documentsFieldsSchema),
    defaultValues: initialValues,
  });
  const { control, handleSubmit, watch } = form;
  useFormMirror(watch, (values, name) => {
    if (name && (DOCUMENT_KEYS as readonly string[]).includes(name)) {
      onDocumentChange?.(name as DocumentKey, values[name as DocumentKey] ?? null);
    }
  });
  const values = useWatch({ control }) as DocumentsFormValues;
  const canProceed = canProceedDocuments(values);

  return (
    <OnboardingLayout
      testID="onboarding-documents"
      step={3}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={d.title}
      subtitle={d.subtitle}
      onBack={onBack}
      // step3-documents: last card bottom (1309) → Next (1368).
      footerGap={59}
      footer={
        <>
          <PrimaryButton
            testID="documents-next"
            label={t.next}
            labelVariant="buttonStrong"
            disabled={!canProceed}
            onPress={handleSubmit(onNext)}
          />
          <LinkButton testID="documents-skip" label={t.skip} onPress={onSkip} style={styles.skip} />
        </>
      }
    >
      {DOCUMENT_KEYS.map((key, index) => (
        <Controller
          key={key}
          control={control}
          name={key}
          render={({ field }) => (
            <FileUploadCard
              testID={`document-${key}`}
              style={index > 0 ? styles.card : styles.first}
              label={CARDS[key].label}
              title={CARDS[key].title}
              value={field.value}
              onChange={file => field.onChange(file)}
            />
          )}
        />
      ))}
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  // Card bottom → next label's line box: 55pt between boxes − 18 (label) − 8 (label gap).
  card: { marginTop: 29 },
  skip: { marginTop: 16 },
});
