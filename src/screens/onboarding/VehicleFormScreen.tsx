import React from 'react';
import { StyleSheet } from 'react-native';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import VehicleForm from '@/components/VehicleForm';
import { ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { useVehicleForm } from '@/hooks/useVehicleForm';
import type { VehicleFormValues } from './schemas/vehicle.schema';

const t = strings.onboarding;
const v = t.vehicle;

export type VehicleFormScreenProps = {
  /** Prefilled from the entry screen (lookup / RC), or empty ("Add your vehicle details manually"). */
  initialValues?: Partial<VehicleFormValues>;
  onValuesChange?: (values: VehicleFormValues) => void;
  /** Number + Make + Model + Fuel + Transmission filled → step 3. */
  onNext: (values: VehicleFormValues) => void;
  /** "Skip for now" → the Dashboard. */
  onSkip: () => void;
  onBack?: () => void;
  /** Dev QA screenshots: open the Make list on mount. */
  qaOpenMakeSheet?: boolean;
};

/** Onboarding step 2 vehicle form (Figma 2b/2c). UI only. */
export default function VehicleFormScreen({
  initialValues,
  onValuesChange,
  onNext,
  onSkip,
  onBack,
  qaOpenMakeSheet,
}: VehicleFormScreenProps) {
  const { form, canSubmit, submit } = useVehicleForm({ initialValues, onValuesChange });

  return (
    <OnboardingLayout
      testID="onboarding-vehicle-form"
      step={2}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={v.title}
      subtitle={v.subtitle}
      onBack={onBack}
      // 2c: Colour field bottom → Next is 59pt.
      footerGap={59}
      footer={
        <>
          <PrimaryButton
            testID="vehicle-form-next"
            label={t.next}
            labelVariant="buttonStrong"
            disabled={!canSubmit}
            onPress={submit(onNext)}
          />
          <LinkButton testID="vehicle-form-skip" label={t.skip} onPress={onSkip} style={styles.skip} />
        </>
      }
    >
      <VehicleForm form={form} qaOpenMakeSheet={qaOpenMakeSheet} style={styles.first} />
    </OnboardingLayout>
  );
}

const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  skip: { marginTop: 16 },
});
