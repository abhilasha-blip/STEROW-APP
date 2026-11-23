import React, { memo } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import ChevronRight from '@/assets/icons/dashboard/chevron-right.svg';
import AppText from '@/components/AppText';
import { useTheme, useThemedStyles, type Theme } from '@/theme';

const CAR = require('@/assets/images/dashboard/vehicle-car.jpg');
const PLACEHOLDER = require('@/assets/images/dashboard/vehicle-placeholder.png');

export type VehicleCardProps = {
  /** "MG ZS EV"; "N/A" for the placeholder. */
  title: string;
  /** Vehicle number, or "Update your vehicle info" (placeholder, violet). */
  subtitle: string;
  placeholder?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  accessibilityLabel?: string;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The white vehicle card (dashboard.svg 340×94 / my-documents.svg 354×94): car photo 96×64 (r12), name
 * (SemiBold 16, brown) and number (Regular 14, muted), chevron. Placeholder: grey car, "N/A", violet link.
 */
function VehicleCard({
  title,
  subtitle,
  placeholder = false,
  onPress,
  showChevron = true,
  accessibilityLabel,
  testID,
  style,
}: VehicleCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel ?? `${title}, ${subtitle}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed, style]}
    >
      <View style={styles.imageBox}>
        <Image
          source={placeholder ? PLACEHOLDER : CAR}
          style={placeholder ? styles.placeholder : styles.image}
          resizeMode={placeholder ? 'contain' : 'cover'}
        />
      </View>
      <View style={styles.text}>
        <AppText variant="cardTitle" color="dashboard.sectionTitle" numberOfLines={1}>
          {title}
        </AppText>
        <AppText
          variant={placeholder ? 'cardTitle' : 'cardSubtitle'}
          color={placeholder ? 'dashboard.count' : 'dashboard.muted'}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.8}
          style={styles.subtitle}
        >
          {subtitle}
        </AppText>
      </View>
      {showChevron && <ChevronRight width={24} height={24} color={colors.dashboard.muted} />}
    </Pressable>
  );
}

export default memo(VehicleCard);

const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 94,
      paddingLeft: 17,
      paddingRight: 16,
      borderRadius: radius.sheet,
      backgroundColor: colors.dashboard.card,
      borderWidth: 1,
      borderColor: colors.dashboard.cardBorder,
    },
    imageBox: { width: 96, height: 64, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
    // dashboard.svg: the 124×124 photo is cropped into the 96×64 box, centred.
    image: { width: 124, height: 124 },
    placeholder: { width: 96, height: 72 },
    text: { flex: 1, marginLeft: 16, marginRight: 4 },
    subtitle: { marginTop: 4 },
    pressed: { opacity: 0.85 },
  });
