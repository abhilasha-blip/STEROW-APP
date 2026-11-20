import React, { useCallback, useState } from 'react';
import { StyleSheet } from 'react-native';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import { ONBOARDING_TOTAL_STEPS, type DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import type { UploadedFile } from '@/utils/uploadFile';
import { canProceedDocuments, type DocumentsFormValues } from './schemas/documents.schema';

const t = strings.onboarding;
const d = t.documents;

export type VehicleDocumentsScreenProps = {
  /** Prefilled: the RC from step 2 (see resolveDocuments). */
  initialValues: DocumentsFormValues;
  onNext: (values: DocumentsFormValues) => void;
  onSkip: () => void;
  onBack?: () => void;
  /** Called with the document that changed (the store records it as chosen on this step). */
  onDocumentChange?: (key: DocumentKey, file: UploadedFile | null) => void;
};

/** Onboarding step 3 "Your Vehicle documents": RC, Insurance, Pollution Certificate (UI only). */
export default function VehicleDocumentsScreen({
  initialValues,
  onNext,
  onSkip,
  onBack,
  onDocumentChange,
}: VehicleDocumentsScreenProps) {
  const [values, setValues] = useState(initialValues);
  const onChange = useCallback(
    (key: DocumentKey, file: UploadedFile | null) => {
      setValues(prev => ({ ...prev, [key]: file }));
      onDocumentChange?.(key, file);
    },
    [onDocumentChange],
  );
  const canProceed = canProceedDocuments(values);

  return (
    <OnboardingLayout
      testID="onboarding-documents"
      step={3}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={d.title}
      subtitle={d.subtitle}
      onBack={onBack}
      // step3-documents: last card bottom → Next is 59pt.
      footerGap={59}
      footer={
        <>
          <PrimaryButton
            testID="documents-next"
            label={t.next}
            labelVariant="buttonStrong"
            disabled={!canProceed}
            onPress={() => onNext(values)}
          />
          <LinkButton testID="documents-skip" label={t.skip} onPress={onSkip} style={styles.skip} />
        </>
      }
    >
      <DocumentsUploadList values={values} onChange={onChange} style={styles.first} />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  skip: { marginTop: 16 },
});
