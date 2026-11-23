import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller } from 'react-hook-form';
import AppText from '@/components/AppText';
import AvatarCircle from '@/components/AvatarCircle';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { useRevealOnFocus } from '@/components/OnboardingLayout';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import { EMAIL_MAX_LENGTH, ONBOARDING_STEP, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { FULL_NAME_MAX } from '@/constants/auth';
import { strings } from '@/constants/strings';
import { useTheme } from '@/theme';
import AvatarPickerSheet from './AvatarPickerSheet';
import type { ProfileFormValues } from './schemas/profile.schema';
import {
  useOnboardingProfileForm,
  type OnboardingProfileForm,
  type OnboardingProfileInitialValues,
} from './useOnboardingProfileForm';

const t = strings.onboarding;
const p = t.profile;

export type OnboardingProfileScreenProps = {
  initialValues?: OnboardingProfileInitialValues;
  onNext: (values: ProfileFormValues) => void;
  onSkip: () => void;
  onBack?: () => void;
  /** Every change (the onboarding store keeps the values for Back / re-entry). */
  onValuesChange?: (values: ProfileFormValues) => void;
  /** Next is saving: spinner on Next, Next and Skip disabled (no double submit). */
  saving?: boolean;
};

/** Onboarding 1/3 "My Profile": Profile photo, Full Name, Email. */
export default function OnboardingProfileScreen({
  initialValues,
  onNext,
  onSkip,
  onBack,
  onValuesChange,
  saving = false,
}: OnboardingProfileScreenProps) {
  const profile = useOnboardingProfileForm({ initialValues, onNext, onSkip, onValuesChange });

  return (
    <OnboardingLayout
      testID="onboarding-profile"
      step={ONBOARDING_STEP.profile}
      totalSteps={ONBOARDING_TOTAL_STEPS}
      title={p.title}
      subtitle={p.subtitle}
      onBack={onBack}
      footer={
        <>
          <PrimaryButton
            testID="profile-next"
            label={t.next}
            labelVariant="buttonStrong"
            loading={saving}
            disabled={saving}
            onPress={profile.submit}
          />
          <LinkButton
            testID="profile-skip"
            label={t.skip}
            onPress={profile.skip}
            disabled={saving}
            style={styles.skip}
          />
        </>
      }
    >
      <ProfileFields profile={profile} />
    </OnboardingLayout>
  );
}

/** Rendered inside the layout so the fields can use its keyboard "reveal" context. */
function ProfileFields({ profile }: { profile: OnboardingProfileForm }) {
  const { sizes } = useTheme();
  const reveal = useRevealOnFocus();
  const [avatarSheet, setAvatarSheet] = useState(false);
  const { control, errors, avatar } = profile;

  return (
    <>
      <View style={styles.avatarBlock}>
        <AvatarCircle
          testID="profile-avatar"
          avatar={avatar}
          size={sizes.avatarLarge}
          showEditBadge
          onPress={() => setAvatarSheet(true)}
          accessibilityLabel={p.editAvatarA11y}
        />
        <AppText variant="avatarLabel" color="text.onLight" style={styles.avatarLabel}>
          {p.avatarLabel}
        </AppText>
      </View>

      <View testID="personal-fields" style={styles.firstField}>
        <Controller
          control={control}
          name="fullName"
          render={({ field }) => (
            <TextField
              ref={field.ref}
              testID="full-name"
              variant="light"
              label={p.fullNameLabel}
              placeholder={p.fullNamePlaceholder}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={field.onBlur}
              onFocus={reveal}
              autoCapitalize="words"
              autoCorrect={false}
              textContentType="name"
              autoComplete="name"
              maxLength={FULL_NAME_MAX}
              returnKeyType="done"
              error={errors.fullName?.message}
            />
          )}
        />
        <Controller
          control={control}
          name="email"
          render={({ field }) => (
            <TextField
              ref={field.ref}
              testID="email"
              variant="light"
              style={styles.field}
              label={p.emailLabel}
              placeholder={p.emailPlaceholder}
              value={field.value}
              onChangeText={field.onChange}
              onBlur={() => {
                field.onBlur();
                profile.validateEmailOnBlur();
              }}
              onFocus={reveal}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
              autoComplete="email"
              maxLength={EMAIL_MAX_LENGTH}
              returnKeyType="done"
              error={errors.email?.message}
            />
          )}
        />
      </View>

      <AvatarPickerSheet
        visible={avatarSheet}
        value={avatar}
        onSelect={next => {
          profile.setAvatar(next);
          setAvatarSheet(false);
        }}
        onClose={() => setAvatarSheet(false)}
      />
    </>
  );
}

/* Vertical rhythm measured from design/onboarding (line boxes, not glyph tops). */
const styles = StyleSheet.create({
  avatarBlock: { alignItems: 'center' },
  avatarLabel: { marginTop: 8.5 },
  firstField: { marginTop: 33.8 },
  field: { marginTop: 25.3 },
  skip: { marginTop: 16 },
});
