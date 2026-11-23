import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, StyleSheet, View } from 'react-native';
import ChevronRight from '@/assets/icons/dashboard/chevron-right.svg';
import DocImage from '@/assets/icons/dashboard/doc-image.svg';
import DocPdf from '@/assets/icons/dashboard/doc-pdf.svg';
import Upload from '@/assets/icons/dashboard/upload.svg';
import { toUserError } from '@/api/errorMessages';
import {
  documentFileUrl,
  documentStatusFor,
  type DocumentStatus,
  type MyDocument,
} from '@/api/services/myDocuments.service';
import AppText from '@/components/AppText';
import VehiclePickerSheet from '@/components/documents/VehiclePickerSheet';
import LightScreen from '@/components/LightScreen';
import PrimaryButton from '@/components/PrimaryButton';
import { useToast } from '@/components/Toast';
import { strings } from '@/constants/strings';
import { useMyVehicles } from '@/hooks/api/useDocumentsStep';
import { useMyDocuments } from '@/hooks/api/useMyDocuments';
import type { HomeStackScreenProps } from '@/navigation/types';
import { useAuthStore } from '@/store/auth.store';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import VehicleCard from '../../dashboard/components/VehicleCard';
import { vehicleName } from '../../dashboard/components/VehicleCarousel';

const t = strings.myDocuments;

/** "15/01/2025" (my-documents.png). */
export const formatExpiry = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

const STATUS_LABEL: Record<DocumentStatus, string> = { active: t.active, expiringSoon: t.expiringSoon, expired: t.expired };

/**
 * My Documents (design/dashboard/my-documents.png): the selected vehicle (Change → vehicle sheet), the
 * "Document List" (Insurance, Pollution, RC, FASTag, Driving License) with an Active / Expiring soon /
 * Expired pill from the expiry date, and "Upload documents" → the document cards for that vehicle.
 */
export default function MyDocumentsScreen({ navigation, route }: HomeStackScreenProps<'MyDocuments'>) {
  const uid = useAuthStore(s => s.user?.id);
  const toast = useToast();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const vehicles = useMyVehicles(uid);
  const [vehicleId, setVehicleId] = useState<string | null>(route.params?.vehicleId ?? null);
  const [picker, setPicker] = useState(false);
  useEffect(() => {
    if (!vehicleId && vehicles.data?.[0]) {
      setVehicleId(vehicles.data[0].id);
    }
  }, [vehicleId, vehicles.data]);
  const vehicle = vehicles.data?.find(v => v.id === vehicleId);
  const docs = useMyDocuments(uid, vehicleId);

  const open = async (doc: MyDocument) => {
    try {
      const url = await documentFileUrl(doc);
      if (url) {
        await Linking.openURL(url);
      }
    } catch (e) {
      toast.error(toUserError(e).userMessage);
    }
  };

  return (
    <LightScreen
      testID="my-documents"
      title={t.title}
      onBack={() => navigation.goBack()}
      aboveTabs
      footer={
        vehicle && (
          <PrimaryButton
            testID="my-documents-upload"
            label={t.upload}
            labelVariant="buttonStrong"
            showArrow={false}
            icon={<Upload width={20} height={20} color={colors.primary.contrastText} />}
            onPress={() => navigation.navigate('UploadDocuments', { vehicleId: vehicle.id })}
          />
        )
      }
    >
      <View style={styles.sectionRow}>
        <AppText variant="sectionTitleSmall" color="dashboard.sectionTitle" accessibilityRole="header">
          {t.selectVehicle}
        </AppText>
        {(vehicles.data?.length ?? 0) > 1 && (
          <Pressable testID="my-documents-change" onPress={() => setPicker(true)} hitSlop={8} accessibilityRole="button">
            <AppText variant="cardTitle" color="dashboard.count">
              {t.change}
            </AppText>
          </Pressable>
        )}
      </View>
      {vehicles.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.input.lightSpinner} />
      ) : vehicle ? (
        <VehicleCard testID="my-documents-vehicle" title={vehicleName(vehicle)} subtitle={vehicle.vehicleNumber} showChevron={false} />
      ) : (
        <VehicleCard
          testID="my-documents-no-vehicle"
          placeholder
          title={strings.dashboard.noVehicleTitle}
          subtitle={strings.dashboard.noVehicleSubtitle}
          onPress={() => navigation.navigate('AddVehicle')}
        />
      )}

      <AppText variant="sectionTitleSmall" color="dashboard.sectionTitle" style={styles.listTitle} accessibilityRole="header">
        {t.documentList}
      </AppText>
      {docs.isLoading ? (
        <ActivityIndicator style={styles.loading} color={colors.input.lightSpinner} />
      ) : !vehicle ? (
        <AppText variant="body" color="text.onLightMuted">
          {t.noVehicle}
        </AppText>
      ) : docs.data?.length ? (
        <View style={styles.list}>
          {docs.data.map(doc => (
            <DocumentRow key={`${doc.key}-${doc.id}`} doc={doc} onPress={() => open(doc)} />
          ))}
        </View>
      ) : (
        <AppText testID="my-documents-empty" variant="body" color="text.onLightMuted">
          {t.empty}
        </AppText>
      )}

      <VehiclePickerSheet
        testID="my-documents-picker"
        optionTestIDPrefix="my-documents-picker"
        visible={picker}
        vehicles={(vehicles.data ?? []).map(v => ({ id: v.id, vehicleNumber: v.vehicleNumber, name: vehicleName(v) }))}
        selectedId={vehicleId}
        onSelect={id => {
          setVehicleId(id);
          setPicker(false);
        }}
        onClose={() => setPicker(false)}
      />
    </LightScreen>
  );
}

function DocumentRow({ doc, onPress }: { doc: MyDocument; onPress: () => void }) {
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const status = documentStatusFor(doc.expiry);
  const Icon = doc.documentPath?.toLowerCase().endsWith('.pdf') ? DocPdf : DocImage;
  const name = t.names[doc.key];
  const subtitle = [doc.issuer, doc.expiry ? t.expires(formatExpiry(doc.expiry)) : null].filter(Boolean).join(' • ');
  const statusColor =
    status === 'expired' ? 'dashboard.statusExpired' : status === 'expiringSoon' ? 'dashboard.statusExpiring' : 'dashboard.statusActive';
  return (
    <Pressable
      testID={`my-document-${doc.key}`}
      onPress={onPress}
      disabled={!doc.documentPath}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${STATUS_LABEL[status]}${subtitle ? `, ${subtitle}` : ''}`}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.iconTile}>
        <Icon width={24} height={24} color={colors.dashboard.muted} />
      </View>
      <View style={styles.rowText}>
        <View style={styles.nameRow}>
          <AppText variant="cardTitle" color="dashboard.sectionTitle">
            {name}
          </AppText>
          <View testID={`my-document-${doc.key}-status`} style={styles.pill}>
            <View style={[styles.dot, { backgroundColor: colors.dashboard[statusColor.split('.')[1] as 'statusActive'] }]} />
            <AppText variant="tinyStrong" color={statusColor}>
              {STATUS_LABEL[status]}
            </AppText>
          </View>
        </View>
        {!!subtitle && (
          <AppText variant="cardSubtitle" color="dashboard.muted" numberOfLines={1} style={styles.subtitle}>
            {subtitle}
          </AppText>
        )}
      </View>
      <ChevronRight width={24} height={24} color={colors.dashboard.muted} />
    </Pressable>
  );
}

/* my-documents.svg: rows 354×80 (r12), 48pt icon tile (r8, mist), pill 64×19 (r9.5, grey border, violet dot). */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
    listTitle: { marginTop: 32, marginBottom: 16 },
    loading: { marginVertical: 24 },
    list: { gap: 12 },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      minHeight: 80,
      paddingLeft: 16,
      paddingRight: 12,
      borderRadius: radius.md,
      backgroundColor: colors.dashboard.card,
    },
    iconTile: {
      width: 48,
      height: 48,
      borderRadius: radius.sm,
      backgroundColor: colors.dashboard.rowIconTile,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, marginLeft: 12 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    pill: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      height: 19,
      paddingHorizontal: 8,
      borderRadius: radius.pill,
      borderWidth: 1,
      borderColor: colors.dashboard.pillBorder,
      backgroundColor: colors.dashboard.card,
    },
    dot: { width: 6, height: 6, borderRadius: 3 },
    subtitle: { marginTop: 4 },
    pressed: { opacity: 0.85 },
  });
