import React from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import PencilIcon from '@/assets/icons/pencil.svg';
import PersonIcon from '@/assets/icons/person.svg';
import { getAvatar, type AvatarValue } from '@/constants/avatars';
import { useThemedStyles, useTheme, type Theme } from '@/theme';

type AvatarCircleProps = {
  avatar: AvatarValue;
  /** Diameter in pt (Figma: 120 on the screen / sheet preview, 64 in the grid). */
  size: number;
  /** Shows the violet pencil badge at the bottom-right (large avatar on the screen). */
  showEditBadge?: boolean;
  /** Violet ring + soft shadow (grid selection). */
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/*
 * Geometry from design/onboarding (preset avatars are 81 x 119 crops):
 * - 120pt circle: image 81 x 119, centred, its bottom 1pt above the circle's bottom, NOT clipped
 *   to the circle (the shoulders are cut flat and overhang the curve, as in Figma).
 * - 64pt grid circle: image 44 x 65, bottom-aligned, clipped to the circle.
 * - "No avatar": the person silhouette, 46/64 of the circle, centred.
 */
const IMAGE_ASPECT = 119 / 81;
const LARGE_MIN = 100;

export default function AvatarCircle({
  avatar,
  size,
  showEditBadge = false,
  selected = false,
  onPress,
  accessibilityLabel,
  testID,
  style,
}: AvatarCircleProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const large = size >= LARGE_MIN;
  const preset = avatar?.type === 'preset' ? getAvatar(avatar.id) : undefined;

  const imageWidth = large ? (81 / 120) * size : (44 / 64) * size;
  const imageHeight = imageWidth * IMAGE_ASPECT;
  const silhouette = (46 / 64) * size;

  const circle = (
    <View
      style={[
        styles.circle,
        { width: size, height: size, borderRadius: size / 2 },
        !large && styles.clip,
        selected && styles.selected,
      ]}
    >
      {avatar?.type === 'photo' ? (
        <Image
          testID={testID ? `${testID}-photo` : undefined}
          source={{ uri: avatar.uri }}
          resizeMode="cover"
          style={[styles.photo, { borderRadius: size / 2 }]}
        />
      ) : preset ? (
        <Image
          testID={testID ? `${testID}-${preset.id}` : undefined}
          source={preset.source}
          resizeMode="contain"
          style={[
            large ? styles.presetLarge : styles.presetGrid,
            // Offsets are inside the 1pt border, hence the -1.
            { width: imageWidth, height: imageHeight, left: (size - imageWidth) / 2 - 1 },
          ]}
        />
      ) : (
        <PersonIcon
          testID={testID ? `${testID}-none` : undefined}
          width={silhouette}
          height={silhouette}
          color={colors.avatar.placeholder}
        />
      )}
    </View>
  );

  const content = (
    <View style={[{ width: size, height: size }, style]}>
      {circle}
      {showEditBadge && (
        <View style={styles.badge} testID={testID ? `${testID}-badge` : undefined}>
          <PencilIcon width={sizes.iconSmall} height={sizes.iconSmall} color={colors.avatar.badgeIcon} />
        </View>
      )}
    </View>
  );

  if (!onPress) {
    return content;
  }
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected }}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {content}
    </Pressable>
  );
}

const makeStyles = ({ colors, radius, sizes }: Theme) =>
  StyleSheet.create({
    circle: {
      backgroundColor: colors.avatar.background,
      borderWidth: 1,
      borderColor: colors.avatar.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    clip: { overflow: 'hidden' },
    selected: {
      borderColor: colors.avatar.selectedRing,
      // Figma: drop shadow y 4, blur 12, black 24%.
      shadowColor: colors.surface.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.24,
      shadowRadius: 6,
      elevation: 4,
    },
    photo: StyleSheet.absoluteFill,
    // Positions are inside the 1pt border: the large image ends 1pt above the outer edge,
    // the grid image exactly on it.
    presetLarge: { position: 'absolute', bottom: 0 },
    presetGrid: { position: 'absolute', bottom: -1 },
    badge: {
      position: 'absolute',
      right: 0,
      bottom: 0,
      width: sizes.avatarBadge,
      height: sizes.avatarBadge,
      borderRadius: radius.pill,
      backgroundColor: colors.avatar.badge,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pressed: { opacity: 0.85 },
  });
