import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { haptics } from '@/services/haptics';
import { normalizeDlNumber } from '@/utils/validation';
import {
  createDrivingLicenceSchema,
  EMPTY_DRIVING_LICENCE,
  type DrivingLicenceFormValues,
} from './schemas/drivingLicence.schema';
import { useFormMirror } from './useFormMirror';

export type UseDrivingLicenceFormOptions = {
  /** The saved licence (number, file, dates) and / or the store's values on re-entry. */
  initialValues?: Partial<DrivingLicenceFormValues>;
  onNext: (values: DrivingLicenceFormValues) => void;
  onSkip: () => void;
  onValuesChange?: (values: DrivingLicenceFormValues) => void;
  /** Injectable clock (tests). */
  today?: () => Date;
};

/** Form state + actions for onboarding 2/3 "Driving Licence". */
export function useDrivingLicenceForm({
  initialValues,
  onNext,
  onSkip,
  onValuesChange,
  today = () => new Date(),
}: UseDrivingLicenceFormOptions) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock is read at validation time
  const schema = useMemo(() => createDrivingLicenceSchema(today), []);
  const form = useForm<DrivingLicenceFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY_DRIVING_LICENCE, ...initialValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const { control, setValue, getValues, trigger, formState, handleSubmit, watch } = form;
  useFormMirror(watch, onValuesChange);
  const revalidate = formState.isSubmitted;

  const setDlImage = useCallback(
    (uri: string) => {
      setValue('dlImageUri', uri, { shouldDirty: true });
      if (revalidate) {
        trigger('dlImageUri');
      }
    },
    [setValue, trigger, revalidate],
  );

  const removeDlImage = useCallback(() => {
    setValue('dlImageUri', null, { shouldDirty: true });
    if (revalidate) {
      trigger('dlImageUri');
    }
  }, [setValue, trigger, revalidate]);

  /** Dates are checked together once one is picked (Valid up to must follow Issued on). */
  const validateDatesOnClose = useCallback(() => {
    if (getValues('issuedOn') || getValues('validUpto')) {
      trigger(['issuedOn', 'validUpto']);
    }
  }, [getValues, trigger]);

  const submit = handleSubmit(
    values => onNext({ ...values, dlNumber: normalizeDlNumber(values.dlNumber) }),
    () => haptics.error(),
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- computed once per mount
  const maxIssuedOn = useMemo(() => today(), []);

  return {
    form,
    control,
    errors: formState.errors,
    maxIssuedOn,
    setDlImage,
    removeDlImage,
    validateDatesOnClose,
    submit,
    skip: onSkip,
  };
}

export type DrivingLicenceForm = ReturnType<typeof useDrivingLicenceForm>;
