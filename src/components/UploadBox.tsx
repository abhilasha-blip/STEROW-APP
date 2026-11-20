import React from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import UploadIcon from '@/assets/icons/upload.svg';
import { strings } from '@/constants/strings';
import { useThemedStyles, useTheme, type Theme } from '@/theme';
import AppText from './AppText';
import IconCircleButton from './IconCircleButton';

type UploadBoxProps = {
  /** Local file uri of the uploaded image; empty state when null. */
  uri: string | null;
  /** Tap on the empty box / "Browse File" (opens the photo source sheet). */
  onPress: () => void;
  onRemove: () => void;
  title?: string;
  hint?: string;
  browseLabel?: string;
  error?: string;
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
  onPress,
  onRemove,
  title = t.uploadTitle,
  hint = t.uploadHint,
  browseLabel = t.uploadBrowse,
  error,
  testID = 'upload-box',
  style,
}: UploadBoxProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={style}>
      {uri ? (
        <View testID={`${testID}-filled`} style={[styles.box, !!error && styles.boxError]}>
          <Pressable
            onPress={onPress}
            style={styles.previewWrap}
            accessibilityRole="imagebutton"
            accessibilityLabel={t.uploadedPreviewA11y}
          >
            <Image
              testID={`${testID}-image`}
              source={{ uri }}
              resizeMode="contain"
              style={styles.preview}
            />
          </Pressable>
          <IconCircleButton
            testID={`${testID}-remove`}
            onPress={onRemove}
            accessibilityLabel={t.removeUploadA11y}
            style={styles.remove}
          />
        </View>
      ) : (
        <Pressable
          testID={`${testID}-empty`}
          onPress={onPress}
          accessibilityRole="button"
          accessibilityLabel={t.uploadA11y}
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
    previewWrap: {
      flex: 1,
      marginHorizontal: 26,
      marginVertical: 17.5,
    },
    preview: { width: '100%', height: '100%', borderRadius: radius.preview },
    remove: { position: 'absolute', top: 5, right: 5 },
    error: { marginTop: 6 },
  });
