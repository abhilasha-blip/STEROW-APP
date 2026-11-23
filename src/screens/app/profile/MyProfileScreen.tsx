import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import Calendar from '@/assets/icons/calendar.svg';
import AlertCircle from '@/assets/icons/dashboard/alert-circle.svg';
import AlertTriangle from '@/assets/icons/dashboard/alert-triangle.svg';
import Mail from '@/assets/icons/dashboard/mail.svg';
import Person from '@/assets/icons/dashboard/person.svg';
import Phone from '@/assets/icons/dashboard/phone.svg';
import Pencil from '@/assets/icons/pencil.svg';
import { toUserError } from '@/api/errorMessages';
import AppText from '@/components/AppText';
import AvatarCircle from '@/components/AvatarCircle';
import BottomSheet from '@/components/BottomSheet';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import TextField from '@/components/TextField';
import { useToast } from '@/components/Toast';
import { FULL_NAME_MAX } from '@/constants/auth';
import { DEFAULT_AVATAR_ID, type AvatarValue } from '@/constants/avatars';
import { EMAIL_MAX_LENGTH } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import { avatarFile } from '@/hooks/api/useProfileStep';
import { useDashboard } from '@/hooks/api/useDashboard';
import { useEditProfile } from '@/hooks/api/useMyDocuments';
import type { HomeStackScreenProps } from '@/navigation/types';
import AvatarPickerSheet from '@/screens/onboarding/AvatarPickerSheet';
import { useAuthStore } from '@/store/auth.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { display, parseApiPhone } from '@/utils/phone';
import { isValidEmail, isValidFullName, normalizeFullName } from '@/utils/validation';
import { VerifiedShield } from '../share/ShareAccessScreen';

const t = strings.myProfile;
type EditField = 'name' | 'email' | null;

/**
 * My Profile (design/dashboard/my-profile.png): avatar + lime verified badge, "Change image" (the avatar
 * sheet), "Your Profile · N% Completed" (the onboarding parts done), Personal Information (Name; Date of
 * Birth pending backend → "Add") and Contact Information (Email with a red ! as it isn't verified, Mobile
 * verified by OTP, Emergency Contact pending backend). Name, email and photo save through user_details.
 */
export default function MyProfileScreen({ navigation }: HomeStackScreenProps<'MyProfile'>) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const toast = useToast();
  const user = useAuthStore(s => s.user);
  const data = useDashboard();
  const edit = useEditProfile(user?.id ?? '');
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [editing, setEditing] = useState<EditField>(null);

  const avatar: AvatarValue = data.avatarUrl
    ? { type: 'photo', uri: data.avatarUrl }
    : { type: 'preset', id: DEFAULT_AVATAR_ID };
  const phone = user?.phone ? (({ country, national }) => display(country, national))(parseApiPhone(user.phone)) : '';
  const pending = () => toast.success(t.pendingBackend);

  const save = (input: Parameters<typeof edit.mutate>[0], done: string) =>
    edit.mutate(input, {
      onSuccess: () => {
        toast.success(done);
        setEditing(null);
      },
      onError: e => toast.error(toUserError(e).userMessage),
    });

  return (
    <LightScreen testID="my-profile" title={t.title} onBack={() => navigation.goBack()} aboveTabs>
      <View style={styles.top}>
        <View>
          <AvatarCircle testID="my-profile-avatar" avatar={avatar} size={120} />
          <View style={styles.badge}>
            <VerifiedShield size={20} color={colors.dashboard.profileBadgeIcon} checkColor={colors.dashboard.profileBadge} />
          </View>
        </View>
        <Pressable
          testID="my-profile-change-image"
          onPress={() => setAvatarSheet(true)}
          disabled={edit.isPending}
          accessibilityRole="button"
          style={({ pressed }) => [styles.changeImage, pressed && styles.pressed]}
        >
          <Pencil width={18} height={18} color={colors.primary.contrastText} />
          <AppText variant="cardTitle" color="primary.contrastText">
            {t.changeImage}
          </AppText>
        </Pressable>
      </View>

      <View testID="my-profile-completion" style={styles.completion}>
        <AlertCircle width={18} height={18} color={colors.dashboard.tileTitle} />
        <AppText variant="count" color="dashboard.tileTitle" style={styles.flex}>
          {t.yourProfile}
        </AppText>
        <View style={styles.completedChip}>
          <AppText variant="tinyStrong" color="dashboard.count">
            {t.completed(data.completion.percent)}
          </AppText>
        </View>
      </View>

      <Section title={t.personal} onEdit={() => setEditing('name')} testID="my-profile-personal" />
      <Row icon={Person} label={t.name} value={data.fullName} testID="my-profile-name" />
      <Row icon={Calendar} label={t.dob} value={t.add} onPress={pending} testID="my-profile-dob" />

      <Section title={t.contact} onEdit={() => setEditing('email')} testID="my-profile-contact" />
      <Row
        icon={Mail}
        label={t.email}
        value={data.email || t.add}
        onPress={data.email ? undefined : () => setEditing('email')}
        trailing={
          data.email ? (
            <View accessibilityLabel={t.unverifiedA11y}>
              <AlertCircle width={16} height={16} color={colors.dashboard.alert} />
            </View>
          ) : undefined
        }
        testID="my-profile-email"
      />
      <Row
        icon={Phone}
        label={t.mobile}
        value={phone}
        trailing={
          <View accessibilityLabel={t.verifiedA11y}>
            <VerifiedShield size={16} color={colors.dashboard.verified} checkColor={colors.dashboard.verifiedCheck} />
          </View>
        }
        testID="my-profile-mobile"
      />
      <Row icon={AlertTriangle} label={t.emergency} value={t.add} onPress={pending} testID="my-profile-emergency" />

      <AvatarPickerSheet
        visible={avatarSheet}
        value={avatar}
        onClose={() => setAvatarSheet(false)}
        onSelect={next => {
          setAvatarSheet(false);
          if (next && user) {
            try {
              save({ avatar: avatarFile(next) }, t.photoUpdated);
            } catch (e) {
              toast.error(toUserError(e).userMessage);
            }
          }
        }}
      />
      <EditSheet
        field={editing}
        initial={editing === 'name' ? data.fullName : data.email}
        saving={edit.isPending}
        onClose={() => setEditing(null)}
        onSave={value =>
          save(editing === 'name' ? { fullName: normalizeFullName(value) } : { email: value.trim() }, t.saved)
        }
      />
    </LightScreen>
  );
}

function Section({ title, onEdit, testID }: { title: string; onEdit: () => void; testID: string }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.section}>
      <AppText variant="sectionTitleSmall" color="dashboard.sectionTitle" accessibilityRole="header" style={styles.flex}>
        {title}
      </AppText>
      <Pressable
        testID={`${testID}-edit`}
        onPress={onEdit}
        hitSlop={8}
        accessibilityRole="button"
        accessibilityLabel={`${t.edit} ${title}`}
        style={styles.edit}
      >
        <Pencil width={16} height={16} color={colors.dashboard.count} />
        <AppText variant="cardTitle" color="dashboard.count">
          {t.edit}
        </AppText>
      </Pressable>
    </View>
  );
}

function Row({
  icon: Icon,
  label,
  value,
  trailing,
  onPress,
  testID,
}: {
  icon: React.FC<SvgProps>;
  label: string;
  value: string;
  trailing?: React.ReactNode;
  onPress?: () => void;
  testID: string;
}) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityLabel={`${label}: ${value}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <Icon width={18} height={18} color={colors.dashboard.muted} />
      <AppText variant="cardSubtitle" color="dashboard.tileTitle" style={styles.rowLabel}>
        {label}
      </AppText>
      <AppText variant="cardSubtitle" color="dashboard.count" numberOfLines={1} style={styles.rowValue}>
        {value}
      </AppText>
      {trailing && <View style={styles.trailing}>{trailing}</View>}
    </Pressable>
  );
}

function EditSheet({
  field,
  initial,
  saving,
  onSave,
  onClose,
}: {
  field: EditField;
  initial: string;
  saving: boolean;
  onSave: (value: string) => void;
  onClose: () => void;
}) {
  const [value, setValue] = useState(initial);
  const [error, setError] = useState<string | undefined>();
  React.useEffect(() => {
    setValue(initial);
    setError(undefined);
  }, [field, initial]);
  const isName = field === 'name';
  return (
    <BottomSheet
      testID="my-profile-edit-sheet"
      visible={!!field}
      title={isName ? t.editName : t.editEmail}
      onClose={onClose}
    >
      <View style={sheetStyles.body}>
        <TextField
          testID="my-profile-edit-input"
          variant="light"
          label={isName ? t.name : t.email}
          value={value}
          onChangeText={setValue}
          autoCapitalize={isName ? 'words' : 'none'}
          keyboardType={isName ? 'default' : 'email-address'}
          autoCorrect={false}
          maxLength={isName ? FULL_NAME_MAX : EMAIL_MAX_LENGTH}
          error={error}
        />
        <PrimaryButton
          testID="my-profile-edit-save"
          style={sheetStyles.save}
          label={t.save}
          labelVariant="buttonStrong"
          showArrow={false}
          loading={saving}
          onPress={() => {
            const ok = isName ? isValidFullName(value) : isValidEmail(value.trim());
            if (!ok) {
              setError(isName ? strings.onboarding.errors.fullName : strings.onboarding.errors.emailInvalid);
              return;
            }
            onSave(value);
          }}
        />
      </View>
    </BottomSheet>
  );
}

const sheetStyles = StyleSheet.create({ body: { paddingTop: 8, paddingBottom: 16 }, save: { marginTop: 24 } });

/* my-profile.png @1x: avatar 120 at (24,128), "Change image" 170×40 (r20) on the right; completion pill
   354×38 (r19); section titles 16 SemiBold brown + "✎ Edit"; rows 354×48 (r12), 8pt apart. */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    flex: { flex: 1 },
    top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    badge: {
      position: 'absolute',
      right: -2,
      bottom: 6,
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: colors.dashboard.profileBadge,
      borderWidth: 2,
      borderColor: colors.dashboard.background,
      alignItems: 'center',
      justifyContent: 'center',
    },
    changeImage: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 40,
      paddingHorizontal: 20,
      borderRadius: 20,
      backgroundColor: colors.primary.main,
    },
    completion: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      height: 38,
      marginTop: 24,
      paddingLeft: 14,
      paddingRight: 6,
      borderRadius: 19,
      backgroundColor: colors.dashboard.card,
      shadowColor: colors.surface.shadow,
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 2 },
      elevation: 2,
    },
    completedChip: {
      height: 26,
      paddingHorizontal: 10,
      justifyContent: 'center',
      borderRadius: 13,
      backgroundColor: colors.dashboard.chip,
    },
    section: { flexDirection: 'row', alignItems: 'center', marginTop: 24, marginBottom: 12 },
    edit: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      height: 48,
      marginBottom: 8,
      paddingHorizontal: 16,
      borderRadius: radius.md,
      backgroundColor: colors.dashboard.card,
    },
    rowLabel: { marginLeft: 12 },
    rowValue: { flex: 1, textAlign: 'right', marginLeft: 12 },
    trailing: { marginLeft: 6 },
    pressed: { opacity: 0.85 },
  });
