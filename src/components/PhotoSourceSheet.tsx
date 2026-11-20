import React, { useRef } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import CameraIcon from '@/assets/icons/camera.svg';
import UploadIcon from '@/assets/icons/upload.svg';
import { strings } from '@/constants/strings';
import { pickPhoto, type PhotoSource, type PickedPhoto } from '@/services/imagePicker';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import AppText from './AppText';
import BottomSheet from './BottomSheet';
import LinkButton from './LinkButton';

type PhotoSourceSheetProps = {
  visible: boolean;
  onClose: () => void;
  /** Called with the local file once the user took / chose a photo. */
  onPicked: (photo: PickedPhoto) => void;
  testID?: string;
};

const t = strings.onboarding.photoSource;

const ERROR_MESSAGES = {
  camera_unavailable: t.cameraUnavailable,
  permission: t.permissionDenied,
  too_large: t.tooLarge,
  other: strings.common.genericError,
} as const;

/**
 * Small action sheet: "Take photo" / "Choose from gallery" / Cancel.
 * The picker opens only after the sheet has fully closed (see BottomSheet.onClosed).
 */
export default function PhotoSourceSheet({ visible, onClose, onPicked, testID = 'photo-source' }: PhotoSourceSheetProps) {
  const styles = useThemedStyles(makeStyles);
  const pending = useRef<PhotoSource | null>(null);

  const choose = (source: PhotoSource) => {
    pending.current = source;
    onClose();
  };

  const onClosed = async () => {
    const source = pending.current;
    pending.current = null;
    if (!source) {
      return;
    }
    const result = await pickPhoto(source);
    if (result.status === 'picked') {
      onPicked(result.photo);
    } else if (result.status === 'error') {
      Alert.alert(ERROR_MESSAGES[result.reason]);
    }
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      onClosed={onClosed}
      title={t.title}
      testID={testID}
    >
      <View style={styles.options}>
        <Option testID={`${testID}-camera`} icon={CameraIcon} label={t.camera} onPress={() => choose('camera')} />
        <Option testID={`${testID}-gallery`} icon={UploadIcon} label={t.gallery} onPress={() => choose('gallery')} />
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
