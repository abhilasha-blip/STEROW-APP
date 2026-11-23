import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_AVATAR_ID, type AvatarValue } from '@/constants/avatars';
import { MIN_AGE_YEARS } from '@/constants/onboarding';
import { haptics } from '@/services/haptics';
import { latestDobFor, normalizeFullName } from '@/utils/validation';
import { createProfileSchema, type ProfileFormValues } from './schemas/profile.schema';
import { useFormMirror } from './useFormMirror';
import { useFormSelector } from './useFormSelector';

export type OnboardingProfileInitialValues = Partial<ProfileFormValues>;

export type UseOnboardingProfileFormOptions = {
  /** Saved user_details (Full Name, avatar) and / or the store's values on re-entry. */
  initialValues?: OnboardingProfileInitialValues;
  /** Receives the validated, normalised values. */
  onNext: (values: ProfileFormValues) => void;
  onSkip: () => void;
  /** Every change (mirrored into the onboarding store). */
  onValuesChange?: (values: ProfileFormValues) => void;
  /** Injectable clock (tests). */
  today?: () => Date;
};

export const EMPTY_PROFILE: ProfileFormValues = {
  // The design shows the first avatar pre-selected.
  avatar: { type: 'preset', id: DEFAULT_AVATAR_ID },
  fullName: '',
  dob: null,
  email: '',
};

/** Form state + actions for onboarding 1/3 "My Profile". The screen only renders what this returns. */
export function useOnboardingProfileForm({
  initialValues,
  onNext,
  onSkip,
  onValuesChange,
  today = () => new Date(),
}: UseOnboardingProfileFormOptions) {
  // eslint-disable-next-line react-hooks/exhaustive-deps -- the clock is read at validation time
  const schema = useMemo(() => createProfileSchema(today), []);
  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...EMPTY_PROFILE, ...initialValues },
    mode: 'onSubmit',
    reValidateMode: 'onChange',
  });
  const { control, setValue, getValues, trigger, formState, handleSubmit, watch } = form;
  useFormMirror(watch, onValuesChange);

  // Re-renders the step only when the avatar changes, not per keystroke.
  const avatar = useFormSelector(watch, getValues, v => v.avatar);

  const setAvatar = useCallback(
    (next: AvatarValue) => setValue('avatar', next, { shouldDirty: true }),
    [setValue],
  );

  /** Email is validated when the field loses focus (once something was typed). */
  const validateEmailOnBlur = useCallback(() => {
    if (getValues('email').trim()) {
      trigger('email');
    }
  }, [getValues, trigger]);

  const validateDobOnClose = useCallback(() => {
    if (getValues('dob')) {
      trigger('dob');
    }
  }, [getValues, trigger]);

  const submit = handleSubmit(
    values => onNext({ ...values, fullName: normalizeFullName(values.fullName), email: values.email.trim() }),
    () => haptics.error(),
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- computed once per mount
  const maxDob = useMemo(() => latestDobFor(MIN_AGE_YEARS, today()), []);

  return {
    form,
    control,
    errors: formState.errors,
    avatar,
    maxDob,
    setAvatar,
    validateEmailOnBlur,
    validateDobOnClose,
    submit,
    skip: onSkip,
  };
}

export type OnboardingProfileForm = ReturnType<typeof useOnboardingProfileForm>;
