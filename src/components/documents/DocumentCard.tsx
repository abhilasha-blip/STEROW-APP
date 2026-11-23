import React, { memo, useState } from 'react';
import { Image, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import CheckCircle from '@/assets/icons/check-circle.svg';
import Close from '@/assets/icons/close.svg';
import CloudUpload from '@/assets/icons/dashboard/cloud-upload.svg';
import DocPdf from '@/assets/icons/dashboard/doc-pdf.svg';
import Info from '@/assets/icons/dashboard/info.svg';
import Leaf from '@/assets/icons/dashboard/leaf.svg';
import RcDocument from '@/assets/icons/dashboard/rc-document.svg';
import ShieldCheck from '@/assets/icons/dashboard/shield-check.svg';
import Tag from '@/assets/icons/dashboard/tag.svg';
import Pencil from '@/assets/icons/pencil.svg';
import AppText from '@/components/AppText';
import PhotoSourceSheet, { PICKER_ERROR_MESSAGES } from '@/components/PhotoSourceSheet';
import type { DocumentKey } from '@/constants/onboarding';
import { strings } from '@/constants/strings';
import {
  documentStatus,
  type DocumentEntry,
  type DocumentFieldValues,
} from '@/screens/onboarding/schemas/documents.schema';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { isPdf, validateUpload } from '@/utils/uploadFile';
import DocumentDetailsSheet from './DocumentDetailsSheet';
import DocumentInfoSheet from './DocumentInfoSheet';

const d = strings.onboarding.documents;
const u = strings.onboarding.upload;

export const DOCUMENT_ICONS: Record<DocumentKey, React.FC<SvgProps>> = {
  rc: RcDocument,
  insurance: ShieldCheck,
  pollution: Leaf,
  fastag: Tag,
};

export type DocumentCardProps = {
  documentKey: DocumentKey;
  entry: DocumentEntry;
  onChange: (entry: DocumentEntry) => void;
  /** Prefills the RC registration number. */
  vehicleNumber?: string;
  /** "Add Manually" / "Edit details" opens this instead of the details sheet (3/3 RC → Your Vehicle details). */
  onManual?: () => void;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

const UPLOAD_ERRORS = { unsupported_type: u.unsupportedType, too_large: u.tooLarge } as const;

/**
 * One document on 3/3 (design/dashboard/vehicle-documents-step.jpeg): icon tile, title, (i); then
 * "Upload File" and "Add Manually" side by side. An uploaded file replaces the upload tile with its
 * preview (+ remove); saved details turn "Add Manually" into "Edit details". "✓ Added" once it can be saved.
 */
function DocumentCard({ documentKey, entry, onChange, vehicleNumber, onManual, testID = `document-${documentKey}`, style }: DocumentCardProps) {
  const { colors, sizes } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const card = d.cards[documentKey];
  const Icon = DOCUMENT_ICONS[documentKey];
  const status = documentStatus(documentKey, entry);
  const [infoOpen, setInfoOpen] = useState(false);
  const [sourceOpen, setSourceOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [error, setError] = useState<string | undefined>();

  const prefill: DocumentFieldValues =
    entry.fields ?? (documentKey === 'rc' && vehicleNumber ? { registrationNumber: vehicleNumber } : {});

  return (
    <View testID={testID} style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Icon width={24} height={24} color={colors.documents.icon} />
        </View>
        <View style={styles.titleBlock}>
          <AppText variant="documentTitle" color="documents.tileTitle" numberOfLines={2}>
            {card.title}
          </AppText>
          {status === 'added' && (
            <View testID={`${testID}-added`} style={styles.addedBadge}>
              <CheckCircle width={14} height={14} color={colors.documents.added} />
              <AppText variant="tinyStrong" color="documents.added">
                {d.added}
              </AppText>
            </View>
          )}
        </View>
        <Pressable
          testID={`${testID}-info`}
          onPress={() => setInfoOpen(true)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={d.infoA11y(card.title)}
        >
          <Info width={24} height={24} color={colors.documents.tileTitle} />
        </Pressable>
      </View>

      <View style={styles.tiles}>
        {entry.file ? (
          <View testID={`${testID}-file`} style={[styles.tile, styles.uploadTile, styles.fileTile]}>
            {isPdf(entry.file) ? (
              <DocPdf width={28} height={28} color={colors.documents.tileIcon} />
            ) : (
              <Image
                testID={`${testID}-preview`}
                source={{ uri: entry.file.uri }}
                style={styles.preview}
                resizeMode="cover"
                accessibilityIgnoresInvertColors
              />
            )}
            <AppText variant="tiny" color="documents.tileTitle" numberOfLines={1} style={styles.fileName}>
              {entry.file.name}
            </AppText>
            <Pressable
              testID={`${testID}-remove`}
              style={styles.remove}
              onPress={() => onChange({ ...entry, file: null })}
              hitSlop={8}
              accessibilityRole="button"
              accessibilityLabel={d.removeA11y(card.title)}
            >
              <Close width={sizes.iconSmall - 4} height={sizes.iconSmall - 4} color={colors.input.lightIcon} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID={`${testID}-upload`}
            style={({ pressed }) => [styles.tile, styles.uploadTile, pressed && styles.pressed]}
            onPress={() => setSourceOpen(true)}
            accessibilityRole="button"
            accessibilityLabel={d.uploadA11y(card.title)}
            accessibilityHint={d.uploadHint}
          >
            <CloudUpload width={28} height={28} color={colors.documents.tileIcon} />
            <AppText variant="tileAction" color="documents.tileTitle" style={styles.tileLabel}>
              {d.uploadFile}
            </AppText>
            <AppText variant="tiny" color="text.onLightMuted">
              {d.uploadHint}
            </AppText>
          </Pressable>
        )}
        <Pressable
          testID={`${testID}-manual`}
          style={({ pressed }) => [styles.tile, styles.manualTile, pressed && styles.pressed]}
          onPress={() => (onManual ? onManual() : setDetailsOpen(true))}
          accessibilityRole="button"
          accessibilityLabel={d.manualA11y(card.title)}
        >
          <Pencil width={24} height={24} color={colors.documents.tileIcon} />
          <AppText variant="tileAction" color="text.link" style={styles.tileLabel}>
            {entry.fields ? d.editDetails : status === 'needsDetails' ? d.addDetails : d.addManually}
          </AppText>
        </Pressable>
      </View>

      {status === 'needsDetails' && (
        <AppText testID={`${testID}-needs-details`} variant="error" color="status.errorOnLight" style={styles.hint}>
          {d.needsDetails}
        </AppText>
      )}
      {!!error && (
        <AppText variant="error" color="status.errorOnLight" style={styles.hint}>
          {error}
        </AppText>
      )}

      <DocumentInfoSheet visible={infoOpen} documentKey={documentKey} onClose={() => setInfoOpen(false)} />
      <PhotoSourceSheet
        testID={`${testID}-source`}
        title={u.sheetTitle}
        includeDocument
        visible={sourceOpen}
        onClose={() => setSourceOpen(false)}
        onError={reason => setError(PICKER_ERROR_MESSAGES[reason])}
        onPicked={picked => {
          const result = validateUpload(picked);
          if (result.ok) {
            setError(undefined);
            onChange({ ...entry, file: result.file });
          } else {
            setError(UPLOAD_ERRORS[result.error]);
          }
        }}
      />
      <DocumentDetailsSheet
        testID={`${testID}-details`}
        visible={detailsOpen}
        documentKey={documentKey}
        initialValues={prefill}
        onClose={() => setDetailsOpen(false)}
        onSave={fields => {
          onChange({ ...entry, fields });
          setDetailsOpen(false);
        }}
      />
    </View>
  );
}

export default memo(DocumentCard);

/* Measured on vehicle-documents-step.jpeg (772 px wide = 1.92 px/pt). */
const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: colors.documents.card,
      borderRadius: radius.sheet,
      padding: spacing.lg,
    },
    header: { flexDirection: 'row', alignItems: 'center' },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.documents.iconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    titleBlock: { flex: 1, marginHorizontal: spacing.md },
    addedBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      alignSelf: 'flex-start',
      gap: 4,
      marginTop: 4,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: radius.pill,
      backgroundColor: colors.documents.addedBackground,
    },
    tiles: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
    tile: {
      height: 92,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: spacing.xs,
    },
    // The design's upload tile is wider than the manual one (187 : 153 pt).
    uploadTile: { flex: 187, backgroundColor: colors.documents.uploadTile },
    manualTile: {
      flex: 153,
      backgroundColor: colors.documents.manualTile,
      borderWidth: 1,
      borderColor: colors.documents.manualTileBorder,
    },
    tileLabel: { marginTop: 6 },
    fileTile: { paddingHorizontal: spacing.sm },
    preview: { width: 64, height: 44, borderRadius: radius.sm },
    fileName: { marginTop: 6, maxWidth: '90%' },
    remove: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: colors.surface.iconButtonLight,
      alignItems: 'center',
      justifyContent: 'center',
    },
    hint: { marginTop: spacing.sm },
    pressed: { opacity: 0.85 },
  });
