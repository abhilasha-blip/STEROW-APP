import React, { useMemo, useState } from 'react';
import { Keyboard, Pressable, StyleSheet, View } from 'react-native';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import SearchIcon from '@/assets/icons/search.svg';
import AppText from '@/components/AppText';
import ChipGroup from '@/components/ChipGroup';
import DateField from '@/components/DateField';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { FIRST_LABEL_OFFSET, useRevealOnFocus } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import SelectField from '@/components/SelectField';
import TextField from '@/components/TextField';
import {
  AMOUNT_MAX_DIGITS,
  MILEAGE_MAX_DIGITS,
  ONBOARDING_TOTAL_STEPS,
  SERVICE_CENTRE_MAX_LENGTH,
  SERVICE_CENTRE_SUGGESTIONS_MAX,
  type ServiceCentreType,
} from '@/constants/onboarding';
import { MOCK_SERVICE_CENTRES, MOCK_SERVICE_TYPES } from '@/constants/serviceMock';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import { digitsOnly, formatIndianNumber } from '@/utils/validation';
import {
  EMPTY_SERVICE,
  canProceedService,
  serviceFieldsSchema,
  type ServiceFormValues,
} from './schemas/service.schema';
import { useFormMirror } from './useFormMirror';
import { useFormSelector } from './useFormSelector';

const t = strings.onboarding;
const sv = t.service;

const CENTRE_TYPE_OPTIONS = [
  { value: 'authorised' as const, label: sv.centreAuthorised },
  { value: 'other' as const, label: sv.centreOther },
];

export type ServiceDetailsScreenProps = {
  initialValues?: Partial<ServiceFormValues>;
  /** "Next →" with the required fields filled. */
  onNext: (values: ServiceFormValues) => void;
  /** "Skip for now" (finishes onboarding). */
  onSkip: () => void;
  onBack?: () => void;
  onValuesChange?: (values: ServiceFormValues) => void;
  /** Injectable clock: the latest selectable service date. */
  today?: () => Date;
};

/** Onboarding step 4 "Vehicle Service Details" (UI only; service types and centres are mocked). */
export default function ServiceDetailsScreen({
  initialValues,
  onNext,
  onSkip,
  onBack,
  onValuesChange,
  today = () => new Date(),
}: ServiceDetailsScreenProps) {
  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFieldsSchema),
    defaultValues: { ...EMPTY_SERVICE, ...initialValues },
  });
  const { control, handleSubmit, watch, getValues } = form;
  useFormMirror(watch, onValuesChange);
  // Only what the screen shows: typing in a field re-renders that field, not the whole step.
  const { canProceed, centreType } = useFormSelector(watch, getValues, v => ({
    canProceed: canProceedService(v),
    centreType: v.centreType,
  }));
  // eslint-disable-next-line react-hooks/exhaustive-deps -- computed once per mount
  const maxDate = useMemo(() => today(), []);

  return (
    <OnboardingLayout
      testID="onboarding-service"
      step={4}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={sv.title}
      subtitle={sv.subtitle}
      onBack={onBack}
      footer={
        <>
          <PrimaryButton
            testID="service-next"
            label={t.next}
            labelVariant="buttonStrong"
            disabled={!canProceed}
            onPress={handleSubmit(onNext)}
          />
          <LinkButton testID="service-skip" label={t.skip} onPress={onSkip} style={styles.skip} />
        </>
      }
    >
      <Controller
        control={control}
        name="lastServiceDate"
        render={({ field }) => (
          <DateField
            testID="service-date"
            style={styles.first}
            label={sv.lastServiceLabel}
            value={field.value}
            onChange={field.onChange}
            maximumDate={maxDate}
            pickerA11yHint={sv.lastServicePickerA11y}
          />
        )}
      />
      <Controller
        control={control}
        name="centreType"
        render={({ field }) => (
          <ChipGroup<ServiceCentreType>
            testID="service-centre-type"
            style={styles.field}
            label={sv.centreLabel}
            options={CENTRE_TYPE_OPTIONS}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="centreName"
        render={({ field }) => (
          <ServiceCentreSearch
            value={field.value}
            onChange={field.onChange}
            centreType={centreType}
          />
        )}
      />
      <Controller
        control={control}
        name="serviceType"
        render={({ field }) => (
          <SelectField
            testID="service-type"
            style={styles.field}
            label={sv.serviceTypeLabel}
            options={MOCK_SERVICE_TYPES}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
      <Controller
        control={control}
        name="mileage"
        render={({ field }) => <MileageField value={field.value} onChange={field.onChange} />}
      />
      <Controller
        control={control}
        name="amount"
        render={({ field }) => <AmountField value={field.value} onChange={field.onChange} />}
      />
    </OnboardingLayout>
  );
}

function MileageField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const reveal = useRevealOnFocus();
  return (
    <TextField
      testID="service-mileage"
      variant="light"
      style={styles.field}
      label={sv.mileageLabel}
      placeholder={sv.mileagePlaceholder}
      value={formatIndianNumber(value)}
      onChangeText={text => onChange(digitsOnly(text).slice(0, MILEAGE_MAX_DIGITS))}
      onFocus={reveal}
      keyboardType="number-pad"
      returnKeyType="done"
      rightAccessory={
        value ? (
          <AppText variant="inputSmall" color="text.onLightMuted" style={styles.suffix}>
            {sv.mileageUnit}
          </AppText>
        ) : null
      }
    />
  );
}

function AmountField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const reveal = useRevealOnFocus();
  return (
    <TextField
      testID="service-amount"
      variant="light"
      style={styles.field}
      label={sv.amountLabel}
      placeholder={sv.amountPlaceholder}
      value={formatIndianNumber(value)}
      onChangeText={text => onChange(digitsOnly(text).slice(0, AMOUNT_MAX_DIGITS))}
      onFocus={reveal}
      keyboardType="number-pad"
      returnKeyType="done"
      // step4-service: the ₹ glyph is ~11 x 14pt, i.e. 18pt type.
      leftIcon={
        <AppText variant="inputLarge" color="text.onLightMuted">
          {sv.currency}
        </AppText>
      }
    />
  );
}

/**
 * Search box under the centre chips (UI only): mock suggestions in a dropdown below the field while
 * typing, narrowed by the Authorised / Other chip. Tomorrow: the API / Google Places.
 */
function ServiceCentreSearch({
  value,
  onChange,
  centreType,
}: {
  value: string;
  onChange: (v: string) => void;
  centreType: ServiceCentreType | null;
}) {
  const { colors } = useTheme();
  const themed = useThemedStyles(makeStyles);
  const reveal = useRevealOnFocus();
  const [focused, setFocused] = useState(false);
  const [picked, setPicked] = useState<string | null>(value || null);

  const query = value.trim().toLowerCase();
  const suggestions = useMemo(
    () =>
      MOCK_SERVICE_CENTRES.filter(
        c =>
          (!centreType || c.authorised === (centreType === 'authorised')) &&
          (c.name.toLowerCase().includes(query) || c.area.toLowerCase().includes(query)),
      ).slice(0, SERVICE_CENTRE_SUGGESTIONS_MAX),
    [centreType, query],
  );
  const open = focused && query.length > 0 && value !== picked;

  return (
    <View style={styles.search}>
      <TextField
        testID="service-centre-search"
        variant="light"
        label={sv.centreSearchLabel}
        labelHidden
        placeholder={sv.centreSearchPlaceholder}
        value={value}
        onChangeText={onChange}
        onFocus={() => {
          setFocused(true);
          reveal();
        }}
        onBlur={() => setFocused(false)}
        maxLength={SERVICE_CENTRE_MAX_LENGTH}
        autoCorrect={false}
        returnKeyType="search"
        leftIcon={<SearchIcon width={16} height={16} color={colors.text.onLightMuted} />}
      />
      {open && (
        <View
          testID="service-centre-suggestions"
          style={themed.dropdown}
          accessibilityLabel={sv.centreSuggestionsA11y}
        >
          {suggestions.length === 0 ? (
            <AppText variant="body" color="text.onLightMuted" style={themed.row}>
              {sv.centreNoResults}
            </AppText>
          ) : (
            suggestions.map((c, i) => (
              <Pressable
                key={c.id}
                testID={`service-centre-option-${c.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${c.name}, ${c.area}`}
                onPress={() => {
                  setPicked(c.name);
                  onChange(c.name);
                  Keyboard.dismiss();
                }}
                style={({ pressed }) => [themed.row, i > 0 && themed.divider, pressed && themed.pressed]}
              >
                <AppText variant="body" color="text.onLight" numberOfLines={1}>
                  {c.name}
                </AppText>
                <AppText variant="hint" color="text.onLightMuted" numberOfLines={1}>
                  {c.area}
                </AppText>
              </Pressable>
            ))
          )}
        </View>
      )}
    </View>
  );
}

/* Rhythm measured on step4-service (1x PNG): 25.3pt field → label line box, as on steps 1–2. */
const styles = StyleSheet.create({
  first: { marginTop: FIRST_LABEL_OFFSET },
  field: { marginTop: 25.3 },
  // Chips bottom → search field top.
  search: { marginTop: 12 },
  suffix: { marginLeft: 8, marginRight: 8 },
  skip: { marginTop: 16 },
});

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    dropdown: {
      marginTop: spacing.xs,
      borderRadius: radius.field,
      borderWidth: 1,
      borderColor: colors.chip.border,
      backgroundColor: colors.chip.background,
      overflow: 'hidden',
    },
    row: { paddingHorizontal: spacing.lg, paddingVertical: 10 },
    divider: { borderTopWidth: 1, borderTopColor: colors.surface.dividerLight },
    pressed: { opacity: 0.6 },
  });
