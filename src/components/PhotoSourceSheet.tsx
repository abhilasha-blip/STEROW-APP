import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import CameraIcon from '@/assets/icons/camera.svg';
import FileIcon from '@/assets/icons/file.svg';
import UploadIcon from '@/assets/icons/upload.svg';
import { strings } from '@/constants/strings';
import { pickFile, type FileSource } from '@/services/filePicker';
import type { PickedPhoto, PickPhotoResult } from '@/services/imagePicker';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import LinkButton from './LinkButton';

type PhotoSourceSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the local file once the user took / chose a photo (or a PDF). */
  onPicked: (photo: PickedPhoto) => void;
  /** Adds "Choose file (PDF)" (onboarding document cards). */
  includeDocument?: boolean;
  title?: string;
  /** Picker failures. Without it they're shown in an alert (step 1); upload cards show them inline. */
  onError?: (reason: PickerErrorReason) => void;
  testID?: string;
};

export type PickerErrorReason = Extract<PickPhotoResult, { status: 'error' }>['reason'];

const t = strings.onboarding.photoSource;

export const PICKER_ERROR_MESSAGES: Record<PickerErrorReason, string> = {
  camera_unavailable: t.cameraUnavailable,
  permission: t.permissionDenied,
  too_large: t.tooLarge,
  other: strings.common.genericError,
};

/**
 * Small action sheet: "Take photo" / "Choose from gallery" [/ "Choose file (PDF)"] / Cancel.
 * The picker opens only after the sheet has fully closed (see BottomSheet.onClosed).
 */
export default function PhotoSourceSheet({
  visible,
  onClose,
  onPicked,
  includeDocument = false,
  title = t.title,
  onError,
  testID = 'photo-source',
}: PhotoSourceSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const pending = useRef<FileSource | null>(null);

  const choose = (source: FileSource) => {
    pending.current = source;
    onClose();
  };

  const onClosed = async () => {
    const source = pending.current;
    pending.current = null;
    if (!source) {
      return;
    }
    const result = await pickFile(source);
    if (result.status === 'picked') {
      onPicked(result.photo);
    } else if (result.status === 'error') {
      if (onError) {
        onError(result.reason);
      } else {
        Alert.alert(PICKER_ERROR_MESSAGES[result.reason]);
      }
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={title}
      testID={testID}
    >
      <View style={styles.options}>
        <Option testID={`${testID}-camera`} icon={CameraIcon} label={t.camera} onPress={() => choose('camera')} />
        <Option testID={`${testID}-gallery`} icon={UploadIcon} label={t.gallery} onPress={() => choose('gallery')} />
        {includeDocument && (
          <Option testID={`${testID}-document`} icon={FileIcon} label={t.document} onPress={() => choose('document')} />
        )}
      </View>
      <LinkButton testID={`${testID}-cancel`} label={t.cancel} onPress={onClose} style={styles.cancel} />
    </BottomSheet>
  );
}

function Option({
  icon: Icon,
  label,
  onPress,
  testID,
}: {
  icon: React.FC<SvgProps>;
  label: string;
  onPress: () => void;
  testID: string;
}) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.option, pressed && styles.pressed]}
    >
      <View style={styles.iconCircle}>
        <Icon width={sizes.iconSmall + 4} height={sizes.iconSmall + 4} color={colors.input.lightIcon} />
      </View>
      <AppText variant="body" color="text.onLight">
        {label}
      </AppText>
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, sizes, spacing }: Theme) =>
  StyleSheet.create({
    options: { marginTop: spacing.xl, gap: spacing.sm },
    option: {
      flexDirection: 'row',
      alignItems: 'center',
      height: sizes.inputHeight,
      paddingHorizontal: sizes.inputPaddingLight,
      borderRadius: radius.field,
      backgroundColor: colors.input.lightBackground,
      borderWidth: 1,
      borderColor: colors.input.lightBorder,
      gap: spacing.md,
    },
    pressed: { opacity: 0.7 },
    iconCircle: {
      width: sizes.iconButtonSmall,
      height: sizes.iconButtonSmall,
      borderRadius: radius.pill,
      backgroundColor: colors.surface.iconCircleLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    cancel: { marginTop: spacing.md },
  });
