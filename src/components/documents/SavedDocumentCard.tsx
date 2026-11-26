import React, { memo, useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { SvgProps } from 'react-native-svg';
import DocImage from '@/assets/icons/dashboard/doc-image.svg';
import { toUserError } from '@/api/errorMessages';
import { documentFileUrl, type MyDocument } from '@/api/services/myDocuments.service';
import AppText from '@/components/AppText';
import { useToast } from '@/components/Toast';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import { formatExpiry, getDocumentStatus } from '@/utils/documentStatus';
import StatusPill, { STATUS_LABEL } from './StatusPill';

const t = strings.savedDocument;
const L = t.labels;

export type SavedDocumentRow = { label: string; value: string };

/** The details a saved document shows on its read-only card. */
export function savedDocumentRows(doc: MyDocument): SavedDocumentRow[] {
  const v = (value: string | null) => value || t.notGiven;
  const expiry = { label: L.validUpto, value: doc.expiry ? formatExpiry(doc.expiry) : t.notGiven };
  switch (doc.key) {
    case 'drivingLicence':
      return [{ label: L.dlNumber, value: v(doc.number) }, expiry];
    case 'rc':
      return [{ label: L.registrationNumber, value: v(doc.number) }, expiry];
    case 'insurance':
      return [{ label: L.policyNo, value: v(doc.number) }, { label: L.insurer, value: v(doc.issuer) }, expiry];
    case 'pollution':
      return [{ label: L.certificateNo, value: v(doc.number) }, expiry];
    case 'fastag':
      return [{ label: L.fastagId, value: v(doc.number) }];
  }
}

/** Opens a saved document's file through a fresh signed URL; a failure is a toast. */
export function useOpenDocument() {
  const toast = useToast();
  const [opening, setOpening] = useState(false);
  const open = useCallback(
    async (doc: MyDocument) => {
      setOpening(true);
      try {
        const url = await documentFileUrl(doc);
        if (url) {
          await Linking.openURL(url);
        }
      } catch (e) {
        toast.error(toUserError(e).userMessage);
      } finally {
        setOpening(false);
      }
    },
    [toast],
  );
  return { open, opening };
}

export type SavedDocumentDetailsProps = {
  doc: MyDocument;
  /** Shown above the details; the card's own header shows it otherwise. */
  title?: string;
  /** False: the status pill is drawn by the caller (e.g. in the card header). */
  showStatus?: boolean;
  /** The upload is allowed again (expired): no "Already uploaded" line. */
  replaceable?: boolean;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The read-only part of a saved document: its details, the status pill, "View" (signed URL) and, while
 * it hasn't expired, "Already uploaded. You can upload a new one once it expires." No remove / delete.
 */
export const SavedDocumentDetails = memo(function SavedDocumentDetailsView({
  doc,
  title,
  showStatus = true,
  replaceable = false,
  testID = `saved-${doc.key}`,
  style,
}: SavedDocumentDetailsProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const status = getDocumentStatus(doc.expiry);
  const { open, opening } = useOpenDocument();
  const name = title ?? strings.myDocuments.names[doc.key];
  return (
    <View testID={testID} style={style}>
      <View style={styles.panel}>
        {showStatus && (
          <View style={styles.statusRow} accessibilityLabel={t.statusA11y(STATUS_LABEL[status])}>
            <StatusPill testID={`${testID}-status`} status={status} />
          </View>
        )}
        {savedDocumentRows(doc).map((row, i) => (
          <View key={row.label} style={[styles.row, i > 0 && styles.rowDivider]}>
            <AppText variant="cardSubtitle" color="dashboard.muted">
              {row.label}
            </AppText>
            <AppText variant="cardTitle" color="dashboard.sectionTitle" numberOfLines={1} style={styles.value}>
              {row.value}
            </AppText>
          </View>
        ))}
        {!!doc.documentPath && (
          <Pressable
            testID={`${testID}-view`}
            onPress={() => open(doc)}
            disabled={opening}
            accessibilityRole="button"
            accessibilityLabel={t.viewA11y(name)}
            style={({ pressed }) => [styles.view, pressed && styles.pressed]}
          >
            {opening ? (
              <ActivityIndicator size="small" color={colors.input.lightSpinner} />
            ) : (
              <DocImage width={18} height={18} color={colors.text.link} />
            )}
            <AppText variant="tileAction" color="text.link">
              {t.view}
            </AppText>
          </Pressable>
        )}
      </View>
      <AppText testID={`${testID}-helper`} variant="hint" color="text.onLightMuted" style={styles.helper}>
        {replaceable ? t.expired : t.locked}
      </AppText>
    </View>
  );
});

export type SavedDocumentCardProps = {
  doc: MyDocument;
  title: string;
  icon: React.FC<SvgProps>;
  /** Expired: rendered under the details (the upload / form that replaces it). */
  children?: React.ReactNode;
  testID?: string;
  style?: StyleProp<ViewStyle>;
};

/** A white card around SavedDocumentDetails (the driving licence on 2/3 and My Profile). */
function SavedDocumentCard({ doc, title, icon: Icon, children, testID = `saved-${doc.key}`, style }: SavedDocumentCardProps) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const status = getDocumentStatus(doc.expiry);
  return (
    <View testID={`${testID}-card`} style={[styles.card, style]}>
      <View style={styles.header}>
        <View style={styles.iconTile}>
          <Icon width={24} height={24} color={colors.documents.icon} />
        </View>
        <AppText variant="documentTitle" color="documents.tileTitle" style={styles.title} numberOfLines={2}>
          {title}
        </AppText>
        <StatusPill testID={`${testID}-status`} status={status} />
      </View>
      <SavedDocumentDetails doc={doc} title={title} showStatus={false} replaceable={status === 'expired'} testID={testID} />
      {children}
    </View>
  );
}

export default memo(SavedDocumentCard);

const makeStyles = ({ colors, radius, spacing }: Theme) =>
  StyleSheet.create({
    card: { backgroundColor: colors.documents.card, borderRadius: radius.sheet, padding: spacing.lg },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md },
    iconTile: {
      width: 40,
      height: 40,
      borderRadius: 10,
      backgroundColor: colors.documents.iconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: { flex: 1, marginHorizontal: spacing.md },
    panel: {
      marginTop: spacing.md,
      borderRadius: radius.md,
      backgroundColor: colors.documents.savedPanel,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    statusRow: { paddingVertical: spacing.xs },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm, gap: spacing.md },
    rowDivider: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.documents.savedDivider },
    value: { flexShrink: 1, textAlign: 'right' },
    view: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      minHeight: 44,
      marginTop: spacing.xs,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.documents.savedDivider,
    },
    helper: { marginTop: spacing.sm },
    pressed: { opacity: 0.85 },
  });
