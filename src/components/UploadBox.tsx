import React, { useState } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import FileIcon from '@/assets/icons/file.svg';
import UploadIcon from '@/assets/icons/upload.svg';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import { formatFileSize } from '@/utils/uploadFile';
import AppText from './AppText';
import IconCircleButton from './IconCircleButton';

type UploadBoxProps = {
  /** Local file uri of the uploaded file; empty state when null. */
  uri: string | null;
  /** 'pdf' shows a file tile (icon + name + size) instead of an image preview. */
  kind?: 'image' | 'pdf';
  fileName?: string;
  fileSize?: number;
  /** Tap on the empty box / "Browse File" (opens the photo source sheet). */
  onPress: () => void;
  onRemove: () => void;
  title?: string;
  hint?: string;
  browseLabel?: string;
  error?: string;
  /** Corner radius of the image preview (step 1's DL: 15; steps 2–3: 10). */
  previewRadius?: number;
  /** Screen-reader labels (defaults: step 1's driving licence). */
  uploadA11yLabel?: string;
  previewA11yLabel?: string;
  removeA11yLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const t = strings.onboarding.profile;

/**
 * Dashed upload area (354 x 218, radius 8). Measured from design/onboarding:
 * - empty  (drawn under the avatar sheet in step1-avatar-picker.svg): upload icon in a 32pt circle,
 *   "Upload DL image", the format hint and an outlined "Browse File" pill;
 * - filled (step1-dl-upload.svg): the image contain-fitted with 27pt side / 18.5pt top-bottom insets,
 *   radius 15, and a 32pt remove (X) button 6pt from the top-right corner.
 */
export default function UploadBox({
  uri,
  kind = 'image',
  fileName,
  fileSize,
  onPress,
  onRemove,
  title = t.uploadTitle,
  hint = t.uploadHint,
  browseLabel = t.uploadBrowse,
  error,
  previewRadius,
  uploadA11yLabel = t.uploadA11y,
  previewA11yLabel = t.uploadedPreviewA11y,
  removeA11yLabel = t.removeUploadA11y,
  testID = 'upload-box',
  style,
}: UploadBoxProps) {
  const { colors, sizes, radius } = useTheme();
  const styles = useThemedStyles(makeStyles);
  // The image is contain-fitted by hand so the rounded corners follow the picture, not the box.
  const [area, setArea] = useState<Size | null>(null);
  const [natural, setNatural] = useState<{ uri: string; size: Size } | null>(null);
  const fitted = area && natural?.uri === uri ? containSize(natural.size, area) : null;

  return (
    <View style={style}>
      {uri ? (
        <View testID={`${testID}-filled`} style={[styles.box, !!error && styles.boxError]}>
          {kind === 'pdf' ? (
            <Pressable
              testID={`${testID}-file`}
              onPress={onPress}
              style={styles.fileTile}
              accessibilityRole="button"
              accessibilityLabel={`${previewA11yLabel}, ${fileName ?? ''}`}
            >
              <View style={styles.fileIconCircle}>
                <FileIcon width={24} height={24} color={colors.input.lightIcon} />
              </View>
              <AppText variant="body" color="text.onLight" numberOfLines={1} ellipsizeMode="middle" style={styles.fileName}>
                {fileName}
              </AppText>
              {fileSize !== undefined && (
                <AppText variant="hint" color="text.onLightMuted" style={styles.hint}>
                  {formatFileSize(fileSize)}
                </AppText>
              )}
            </Pressable>
          ) : (
            <Pressable
              onPress={onPress}
              style={styles.previewWrap}
              onLayout={e => setArea({ width: e.nativeEvent.layout.width, height: e.nativeEvent.layout.height })}
              accessibilityRole="imagebutton"
              accessibilityLabel={previewA11yLabel}
            >
              <Image
                testID={`${testID}-image`}
                source={{ uri }}
                resizeMode="contain"
                onLoad={e => {
                  const { width, height } = e.nativeEvent.source;
                  if (uri && width > 0 && height > 0) {
                    setNatural({ uri, size: { width, height } });
                  }
                }}
                style={[
                  fitted ?? styles.preview,
                  { borderRadius: previewRadius ?? radius.preview },
                ]}
              />
            </Pressable>
          )}
          <IconCircleButton
            testID={`${testID}-remove`}
            onPress={onRemove}
            accessibilityLabel={removeA11yLabel}
            style={styles.remove}
          />
        </View>
      ) : (
        <Pressable
          testID={`${testID}-empty`}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={uploadA11yLabel}
          accessibilityHint={hint}
          style={({ pressed }) => [styles.box, styles.empty, !!error && styles.boxError, pressed && styles.pressed]}
        >
          <View style={styles.iconCircle}>
            <UploadIcon width={sizes.iconSmall} height={sizes.iconSmall} color={colors.input.lightIcon} />
          </View>
          <AppText variant="body" color="text.onLight" style={styles.title}>
            {title}
          </AppText>
          <AppText variant="hint" color="text.onLightMuted" style={styles.hint}>
            {hint}
          </AppText>
          <View style={styles.browse}>
            <AppText variant="linkSmall" color="text.link">
              {browseLabel}
            </AppText>
          </View>
        </Pressable>
      )}
      {!!error && (
        <AppText variant="error" color="status.errorOnLight" style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </AppText>
      )}
    </View>
  );
}

type Size = { width: number; height: number };

const containSize = (image: Size, box: Size): Size => {
  const scale = Math.min(box.width / image.width, box.height / image.height);
  return { width: image.width * scale, height: image.height * scale };
};

const makeStyles = ({ colors, radius, sizes }: Theme) =>
  StyleSheet.create({
    box: {
      height: sizes.uploadBoxHeight,
      borderRadius: radius.field,
      backgroundColor: colors.input.lightBackground,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: colors.input.lightBorderDashed,
      overflow: 'hidden',
    },
    boxError: { borderColor: colors.status.errorOnLight },
    pressed: { opacity: 0.8 },
    // 39.5pt from the outer edge to the icon circle (the 1pt border included).
    empty: { alignItems: 'center', paddingTop: 38.5 },
    iconCircle: {
      width: sizes.iconButtonSmall,
      height: sizes.iconButtonSmall,
      borderRadius: radius.pill,
      backgroundColor: colors.surface.iconCircleLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // Figma: icon circle bottom → title cap top 19.9pt; title → hint baselines 19pt; hint → pill 15.5pt.
    title: { marginTop: 14.5 },
    hint: { marginTop: 1.5 },
    browse: {
      marginTop: 15.5,
      height: 39,
      paddingHorizontal: 20,
      minWidth: 111,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.primary.main,
      alignItems: 'center',
      justifyContent: 'center',
    },
    // A 300 x 190 area (inside the 1pt border), image centred: step2-rc-uploaded draws the RC at
    // 300 x 190 (inset 27 / 14), step1-dl-upload the wider DL at 300 x 180.9 (inset 27 / 18.6).
    previewWrap: {
      flex: 1,
      marginHorizontal: 26,
      marginVertical: 13,
      alignItems: 'center',
      justifyContent: 'center',
    },
    preview: { width: '100%', height: '100%' },
    remove: { position: 'absolute', top: 5, right: 5 },
    // PDF tile (not in Figma): the empty state's rhythm with a larger file glyph.
    fileTile: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 48 },
    fileIconCircle: {
      width: 56,
      height: 56,
      borderRadius: radius.pill,
      backgroundColor: colors.surface.iconCircleLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    fileName: { marginTop: 14.5, maxWidth: '100%' },
    error: { marginTop: 6 },
  });
