import React, { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import CameraIcon from '@/assets/icons/camera.svg';
import AvatarCircle from '@/components/AvatarCircle';
import BottomSheet from '@/components/BottomSheet';
import LinkButton from '@/components/LinkButton';
import PhotoSourceSheet from '@/components/PhotoSourceSheet';
import PrimaryButton from '@/components/PrimaryButton';
import { AVATARS, isSameAvatar, type AvatarValue } from '@/constants/avatars';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';

type AvatarPickerSheetProps = {
  visible: boolean;
  /** The current choice; the sheet starts from it every time it opens. */
  value: AvatarValue;
  /** "Select": apply the highlighted choice. */
  onSelect: (value: AvatarValue) => void;
  /** X, Cancel, backdrop, swipe down: close without changes. */
  onClose: () => void;
};

const t = strings.onboarding.avatarSheet;
const COLUMNS = 5;
const GAP = 8;

/* Figma (step1-avatar-picker.svg): preview 24pt below the close row, grid 57pt below the
   preview, 64pt cells with 8pt gaps, Select 49pt below the grid, Cancel 16pt below Select. */
export default function AvatarPickerSheet({ visible, value, onSelect, onClose }: AvatarPickerSheetProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [draft, setDraft] = useState<AvatarValue>(value);
  const [photoSheet, setPhotoSheet] = useState(false);
  const [gridWidth, setGridWidth] = useState(0);

  useEffect(() => {
    if (visible) {
      setDraft(value);
    }
  }, [visible, value]);

  const cell = gridWidth ? Math.min(sizes.avatarGrid, (gridWidth - GAP * (COLUMNS - 1)) / COLUMNS) : sizes.avatarGrid;
  const columnGap = gridWidth ? (gridWidth - cell * COLUMNS) / (COLUMNS - 1) : GAP;
  const photo = draft?.type === 'photo' ? draft : null;

  return (
    <BottomSheet visible={visible} onClose={onClose} title={t.title} testID="avatar-sheet">
      <AvatarCircle
        testID="avatar-sheet-preview"
        avatar={draft}
        size={sizes.avatarLarge}
        accessibilityLabel={t.previewA11y}
        style={styles.preview}
      />

      <View
        style={[styles.grid, { columnGap }]}
        onLayout={e => setGridWidth(e.nativeEvent.layout.width)}
        accessibilityRole="radiogroup"
      >
        {AVATARS.map((a, i) => {
          const option: AvatarValue = { type: 'preset', id: a.id };
          return (
            <AvatarCircle
              key={a.id}
              testID={`avatar-option-${a.id}`}
              avatar={option}
              size={cell}
              selected={isSameAvatar(draft, option)}
              onPress={() => setDraft(option)}
              accessibilityLabel={t.avatarA11y(i + 1)}
            />
          );
        })}
        <AvatarCircle
          testID="avatar-option-none"
          avatar={null}
          size={cell}
          selected={draft === null}
          onPress={() => setDraft(null)}
          accessibilityLabel={t.noAvatarA11y}
        />
        <Pressable
          testID="avatar-option-camera"
          onPress={() => setPhotoSheet(true)}
          accessibilityRole="button"
          accessibilityLabel={t.photoA11y}
          accessibilityState={{ selected: !!photo }}
          style={({ pressed }) => [
            styles.cameraTile,
            { width: cell, height: cell },
            !!photo && styles.cameraSelected,
            pressed && styles.pressed,
          ]}
        >
          {photo ? (
            <Image source={{ uri: photo.uri }} style={styles.cameraPhoto} resizeMode="cover" />
          ) : (
            <CameraIcon width={20} height={20} color={colors.input.lightIcon} />
          )}
        </Pressable>
      </View>

      <PrimaryButton
        testID="avatar-sheet-select"
        label={t.select}
        labelVariant="buttonStrong"
        onPress={() => onSelect(draft)}
        style={styles.select}
      />
      <LinkButton testID="avatar-sheet-cancel" label={t.cancel} onPress={onClose} style={styles.cancel} />

      <PhotoSourceSheet
        testID="avatar-photo-source"
        visible={photoSheet}
        onClose={() => setPhotoSheet(false)}
        onPicked={p => setDraft({ type: 'photo', uri: p.uri })}
      />
    </BottomSheet>
  );
}

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    preview: { alignSelf: 'center', marginTop: 24 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: GAP, marginTop: 57 },
    cameraTile: {
      borderRadius: radius.pill,
      backgroundColor: colors.avatar.background,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.input.lightBorderDashed,
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    cameraSelected: { borderStyle: 'solid', borderColor: colors.avatar.selectedRing },
    cameraPhoto: StyleSheet.absoluteFill,
    pressed: { opacity: 0.85 },
    select: { marginTop: 49 },
    cancel: { marginTop: 16 },
  });
