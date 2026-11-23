import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Controller } from 'react-hook-form';
import AppText from '@/components/AppText';
import AvatarCircle from '@/components/AvatarCircle';
import DateField from '@/components/DateField';
import LinkButton from '@/components/LinkButton';
import OnboardingLayout, { useRevealOnFocus } from '@/components/OnboardingLayout';
import OrDivider from '@/components/OrDivider';
import PhotoSourceSheet from '@/components/PhotoSourceSheet';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import UploadBox from '@/components/UploadBox';
import { DL_MAX_LENGTH, EMAIL_MAX_LENGTH, ONBOARDING_TOTAL_STEPS } from '@/constants/onboarding';
import { FULL_NAME_MAX } from '@/constants/auth';
import { strings } from '@/constants/strings';
import { useTheme } from '@/theme';
import { normalizeDlNumber } from '@/utils/validation';
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
  /** Every change (the onboarding store keeps step 1's values for later steps). */
  onValuesChange?: (values: ProfileFormValues) => void;
  /** Injectable clock for the 18+ DOB rule (tests). */
  today?: () => Date;
  /** Next is saving (profile + DL): spinner on Next, Next and Skip disabled (no double submit). */
  saving?: boolean;
};

/** Onboarding step 1 "My Profile" (UI only; no API or storage yet). */
export default function OnboardingProfileScreen({
  initialValues,
  onNext,
  onSkip,
  onBack,
  onValuesChange,
  today,
  saving = false,
}: OnboardingProfileScreenProps) {
  const profile = useOnboardingProfileForm({ initialValues, onNext, onSkip, onValuesChange, today });

  return (
    <OnboardingLayout
      testID="onboarding-profile"
      step={1}
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
  const [dlSourceSheet, setDlSourceSheet] = useState(false);
  const { control, errors, visibility, avatar } = profile;

  return (
    <>
      <View style={styles.avatarBlock}>
        <AvatarCircle
          testID="profile-avatar"
          avatar={avatar}
          size={sizes.avatarLarge}
          showEditBadge
          onPress={() => setAvatarSheet(true)}
          accessibilityLabel={t.profile.editAvatarA11y}
        />
        <AppText variant="avatarLabel" color="text.onLight" style={styles.avatarLabel}>
          {p.avatarLabel}
        </AppText>
      </View>

      <Controller
        control={control}
        name="dlNumber"
        render={({ field }) => (
          <TextField
            ref={field.ref}
            testID="dl-number"
            variant="light"
            style={styles.dlField}
            label={p.dlNumberLabel}
            placeholder={p.dlNumberPlaceholder}
            value={field.value}
            onChangeText={v => field.onChange(normalizeDlNumber(v))}
            onBlur={field.onBlur}
            onFocus={reveal}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            keyboardType="default"
            maxLength={DL_MAX_LENGTH}
            returnKeyType="done"
            error={errors.dlNumber?.message}
          />
        )}
      />

      {visibility.showUpload && (
        <>
          {visibility.showOr && <OrDivider style={styles.or} />}
          <Controller
            control={control}
            name="dlImageUri"
            render={({ field }) => (
              <View style={visibility.showOr ? styles.uploadBlock : styles.uploadBlockNoOr}>
                <AppText variant="fieldLabel" color="text.onLight" style={styles.uploadLabel}>
                  {p.uploadLabel}
                </AppText>
                <UploadBox
                  testID="dl-upload"
                  uri={field.value}
                  onPress={() => setDlSourceSheet(true)}
                  onRemove={profile.removeDlImage}
                  error={errors.dlImageUri?.message}
                />
              </View>
            )}
          />
        </>
      )}

      {visibility.showPersonal && (
        <View testID="personal-fields">
          <Controller
            control={control}
            name="fullName"
            render={({ field }) => (
              <TextField
                ref={field.ref}
                testID="full-name"
                variant="light"
                style={styles.field}
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
            name="dob"
            render={({ field }) => (
              <DateField
                testID="dob"
                style={styles.field}
                label={p.dobLabel}
                value={field.value}
                onChange={field.onChange}
                onClose={profile.validateDobOnClose}
                maximumDate={profile.maxDob}
                error={errors.dob?.message}
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
      )}

      <AvatarPickerSheet
        visible={avatarSheet}
        value={avatar}
        onSelect={next => {
          profile.setAvatar(next);
          setAvatarSheet(false);
        }}
        onClose={() => setAvatarSheet(false)}
      />
      <PhotoSourceSheet
        testID="dl-photo-source"
        visible={dlSourceSheet}
        onClose={() => setDlSourceSheet(false)}
        onPicked={photo => profile.setDlImage(photo.uri)}
      />
    </>
  );
}

/* Vertical rhythm measured from design/onboarding (line boxes, not glyph tops). */
const styles = StyleSheet.create({
  avatarBlock: { alignItems: 'center' },
  avatarLabel: { marginTop: 8.5 },
  dlField: { marginTop: 33.8 },
  field: { marginTop: 25.3 },
  or: { marginTop: 18.5 },
  uploadBlock: { marginTop: 23.8 },
  // No "Or": the same 25.3pt field rhythm as the fields below.
  uploadBlockNoOr: { marginTop: 25.3 },
  uploadLabel: { marginBottom: 8 },
  skip: { marginTop: 16 },
});
