import { useCallback, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DEFAULT_AVATAR_ID, type AvatarValue } from '@/constants/avatars';
import { haptics } from '@/services/haptics';
import { normalizeFullName } from '@/utils/validation';
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
};

export const EMPTY_PROFILE: ProfileFormValues = {
  // The design shows the first avatar pre-selected.
  avatar: { type: 'preset', id: DEFAULT_AVATAR_ID },
  fullName: '',
  email: '',
};

/** Form state + actions for onboarding 1/3 "My Profile". The screen only renders what this returns. */
export function useOnboardingProfileForm({
  initialValues,
  onNext,
  onSkip,
  onValuesChange,
}: UseOnboardingProfileFormOptions) {
  const schema = useMemo(() => createProfileSchema(), []);
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

  /** Full Name is validated when the field loses focus (and on Next). */
  const validateFullNameOnBlur = useCallback(() => {
    trigger('fullName');
  }, [trigger]);

  /** Email is validated when the field loses focus (once something was typed). */
  const validateEmailOnBlur = useCallback(() => {
    if (getValues('email').trim()) {
      trigger('email');
    }
  }, [getValues, trigger]);

  const submit = handleSubmit(
    values => onNext({ ...values, fullName: normalizeFullName(values.fullName), email: values.email.trim() }),
    () => haptics.error(),
  );

  return {
    form,
    control,
    errors: formState.errors,
    avatar,
    setAvatar,
    validateFullNameOnBlur,
    validateEmailOnBlur,
    submit,
    skip: onSkip,
  };
}

export type OnboardingProfileForm = ReturnType<typeof useOnboardingProfileForm>;
