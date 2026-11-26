/**
 * DEV ONLY: the document states that need a backend answer or a read document, seeded for repeatable
 * simulator screenshots (no sign-in, no backend, no OCR call; OCR_ENABLED stays off):
 *
 *   xcrun simctl launch booted com.sterow.app -qaScenario dl-locked [-qaFile "$PWD/design/onboarding/sample-dl.png"]
 *
 * Scenarios: dl-locked (2/3 with a saved, Active licence), dl-expiring (Expiring soon), dl-expired
 * (Expired card + the form), dl-blocked (the 42501 "Hide deleted rows" card with "Skip for now"),
 * autofill-review-dl / autofill-review-insurance (the review form as it opens after a successful read).
 * App.tsx only requires this file under __DEV__.
 */
import React from 'react';
import { Platform, Settings } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ENDPOINTS } from '@/api/endpoints';
import type { MyDocument } from '@/api/services/myDocuments.service';
import AutofillReviewSheet from '@/components/documents/AutofillReviewSheet';
import DocumentsUploadList from '@/components/DocumentsUploadList';
import LightScreen from '@/components/LightScreen';
import { strings } from '@/constants/strings';
import DrivingLicenceScreen from '@/screens/onboarding/DrivingLicenceScreen';
import { EMPTY_DOCUMENTS } from '@/screens/onboarding/schemas/documents.schema';
import { createNavigationTheme, useTheme } from '@/theme';
import type { AutofillDocType, AutofillField, AutofillValues } from '@/utils/documentAutofill';

const noop = () => undefined;

const fromToday = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const licence = (expiry: string | null): MyDocument => ({
  key: 'drivingLicence',
  id: 'qa-dl',
  issuer: null,
  number: 'DL0000000000000',
  expiry,
  documentPath: 'qa/dl.png',
  bucket: ENDPOINTS.SUPABASE.STORAGE.DRIVING_LICENSES,
});

type Review = { docType: AutofillDocType; values: AutofillValues; filled: AutofillField[] };
type Scenario = { savedLicence?: MyDocument; blocked?: boolean; review?: Review; withPhoto?: boolean };

export const QA_DOCUMENT_SCENARIOS: Record<string, Scenario> = {
  'dl-locked': { savedLicence: licence(fromToday(900)) },
  'dl-expiring': { savedLicence: licence(fromToday(9)) },
  'dl-expired': { savedLicence: licence(fromToday(-14)) },
  'dl-blocked': { blocked: true, withPhoto: true },
  /** As read from the DUMMY sample licence: the number (the sample has no dates), user's dates kept. */
  'autofill-review-dl': {
    withPhoto: true,
    review: {
      docType: 'dl',
      values: { dlNumber: 'DL0000000000000', issuedOn: '2020-01-15', validUpto: '' },
      filled: ['dlNumber'],
    },
  },
  'autofill-review-insurance': {
    review: {
      docType: 'insurance',
      values: { policyNo: 'OG-27-1901-1800-00012345', insurer: 'ICICI Lombard', validUpto: '2027-08-31' },
      filled: ['policyNo', 'insurer', 'validUpto'],
    },
  },
};

export function getQaDocumentsScenarioName(): string | null {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return null;
  }
  const name = Settings.get('qaScenario');
  return typeof name === 'string' && name in QA_DOCUMENT_SCENARIOS ? name : null;
}

function qaFileUri(): string | null {
  const path = Settings.get('qaFile');
  if (typeof path !== 'string' || !path) {
    return null;
  }
  return path.startsWith('file://') ? path : `file://${encodeURI(path)}`;
}

const Stack = createNativeStackNavigator();

function Screen({ scenario }: { scenario: Scenario }) {
  const photo = scenario.withPhoto ? qaFileUri() : null;
  const review = scenario.review;
  if (review && review.docType !== 'dl') {
    return (
      <LightScreen title={strings.myDocuments.uploadTitle}>
        <DocumentsUploadList values={EMPTY_DOCUMENTS} onChange={noop} />
        <AutofillReviewSheet visible docType={review.docType} values={review.values} filled={review.filled} onConfirm={noop} onClose={noop} />
      </LightScreen>
    );
  }
  return (
    <>
      <DrivingLicenceScreen
        initialValues={photo ? { dlNumber: 'DL0000000000000', dlImageUri: photo, issuedOn: '2020-01-15', validUpto: null } : undefined}
        savedLicence={scenario.savedLicence}
        blockedMessage={scenario.blocked ? strings.errors.dlDeletedBlocked : undefined}
        onNext={noop}
        onSkip={noop}
        onContinue={noop}
      />
      {review && (
        <AutofillReviewSheet visible docType="dl" values={review.values} filled={review.filled} onConfirm={noop} onClose={noop} />
      )}
    </>
  );
}

export default function QaDocuments({ name }: { name: string }) {
  const theme = useTheme();
  const scenario = QA_DOCUMENT_SCENARIOS[name];
  const Component = React.useCallback(() => <Screen scenario={scenario} />, [scenario]);
  return (
    <NavigationContainer theme={createNavigationTheme(theme)}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="QaDocuments" component={Component} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
