/**
 * DEV ONLY: opens the signed-in screens with seeded data for repeatable simulator screenshots (no sign-in,
 * no backend calls). Launch with iOS launch arguments:
 *
 *   xcrun simctl launch booted com.sterow.app -qaScenario dashboard-complete
 *
 * Scenarios: dashboard-complete, dashboard-incomplete (variant 1: a vehicle, no licence),
 * dashboard-incomplete-2 (variant 2: no vehicle), dashboard-completion-17 / -67 / -83 (badge levels), dashboard-empty (a vehicle, every count 0), drawer, the
 * drawer screens (my-profile, my-documents, share-access, share-access-empty, my-vehicles) and add-vehicle. App.tsx only requires this file under __DEV__.
 */
import React, { useEffect, useRef } from 'react';
import { Platform, Settings } from 'react-native';
import { DrawerActions, NavigationContainer, createNavigationContainerRef } from '@react-navigation/native';
import { onlineManager } from '@tanstack/react-query';
import { queryClient } from '@/api/queryClient';
import type { DashboardCounts } from '@/api/services/dashboard.service';
import type { MyDocument } from '@/api/services/myDocuments.service';
import type { SharedPerson } from '@/api/services/shareAccess.service';
import type { MyVehicle } from '@/api/services/vehicle.service';
import { queryKeys } from '@/hooks/api/queryKeys';
import MainNavigator from '@/navigation/MainNavigator';
import type { HomeStackParamList } from '@/navigation/types';
import { useAuthStore } from '@/store/auth.store';
import { QA_CATALOG } from './QaOnboarding';
import { createNavigationTheme, useTheme } from '@/theme';

const UID = 'qa-user';

const vehicle = (id: string, number: string, make: string, model: string): MyVehicle => ({
  id,
  vehicleNumber: number,
  makeId: `make-${id}`,
  modelId: `model-${id}`,
  variantId: `variant-${id}`,
  makeName: make,
  modelName: model,
  variantName: '',
  fuelType: 'Electric',
  transmissionType: 'Automatic',
  colour: null,
});
const VEHICLES = [vehicle('v1', 'TS09 EV 2345', 'MG', 'ZS EV'), vehicle('v2', 'TS09AB1234', 'Hyundai', 'Creta'), vehicle('v3', 'TS08CD5678', 'Tata', 'Nexon')];
type QaProfile = { fullName: string; email: string; avatarPath: string | null; avatarUrl: string | null };
/** Complete profile (name, email, photo). avatarUrl stays null so the preset avatar shows (no network). */
const PROFILE: QaProfile = { fullName: 'John Cooper', email: 'john.doe@example.com', avatarPath: 'qa/avatar.png', avatarUrl: null };
const NO_PHOTO: QaProfile = { ...PROFILE, avatarPath: null };
const DL = { dlNumber: 'DL0000000000000', documentPath: 'qa/dl.jpg', previewUrl: null, issuedOn: '2020-05-15', validUpto: '2040-05-15' };
const COUNTS: DashboardCounts = { documents: 5, shares: 2, bookings: 1, serviceHistory: 3 };
const ZERO_COUNTS: DashboardCounts = { documents: 0, shares: 0, bookings: 0, serviceHistory: 0 };
/** share-access.svg's two people (sample data for screenshots only). */
const SHARED_PEOPLE: SharedPerson[] = [
  { id: 'p1', name: 'Rajesh Kumar', phone: '9876543210', role: 'driver', verified: true, vehicleIds: ['v1', 'v2'] },
  { id: 'p2', name: 'Priya Sharma', phone: '9876543211', role: 'family', verified: true, vehicleIds: ['v1', 'v2'] },
];
/** my-documents.png's list (expiries chosen to show Active / Expiring soon / Expired). */
const DOCS: MyDocument[] = [
  { key: 'insurance', id: 'd1', issuer: 'ICICI Lombard', number: 'OG-27-1901-1800-00012345', expiry: '2027-01-15', documentPath: 'x/policy.pdf', bucket: 'vehicle-docs' },
  { key: 'pollution', id: 'd2', issuer: null, number: 'TS0090012345', expiry: '2026-12-10', documentPath: 'x/puc.jpg', bucket: 'vehicle-docs' },
  { key: 'rc', id: 'd3', issuer: null, number: 'TS09EV2345', expiry: '2038-03-20', documentPath: 'x/rc.jpg', bucket: 'vehicle-docs' },
  { key: 'drivingLicence', id: 'd4', issuer: null, number: 'DL0000000000000', expiry: '2040-05-15', documentPath: 'x/dl.pdf', bucket: 'driving-licenses' },
];

type Scenario = {
  vehicles: MyVehicle[];
  dl: typeof DL | null;
  counts: DashboardCounts;
  /** user_details (default: PROFILE, complete). */
  profile?: QaProfile;
  /** Vehicle ids that have a document (profile completion; default: all). */
  vehiclesWithDocs?: string[];
  screen?: keyof HomeStackParamList;
  /** My Documents rows (default: DOCS). */
  docs?: MyDocument[];
  drawer?: boolean;
};

export const QA_DASHBOARD_SCENARIOS: Record<string, Scenario> = {
  'dashboard-complete': { vehicles: VEHICLES, dl: DL, counts: COUNTS },
  /** Name, email, mobile: 3/6 = 50% (a vehicle without documents, no photo, no licence). */
  'dashboard-incomplete': { vehicles: VEHICLES.slice(0, 1), dl: null, counts: ZERO_COUNTS, profile: NO_PHOTO, vehiclesWithDocs: [] },
  'dashboard-incomplete-2': { vehicles: [], dl: null, counts: ZERO_COUNTS, profile: NO_PHOTO },
  /** Profile-completion levels for the badge screenshots. */
  'dashboard-completion-17': { vehicles: [], dl: null, counts: ZERO_COUNTS, profile: { fullName: '', email: '', avatarPath: null, avatarUrl: null } },
  'dashboard-completion-67': { vehicles: VEHICLES.slice(0, 1), dl: DL, counts: ZERO_COUNTS, profile: NO_PHOTO, vehiclesWithDocs: [] },
  'dashboard-completion-83': { vehicles: VEHICLES.slice(0, 1), dl: DL, counts: COUNTS, profile: NO_PHOTO },
  /** Profile + licence + one vehicle, but no documents, shares or bookings: every tile 0. */
  'dashboard-empty': { vehicles: VEHICLES.slice(0, 1), dl: DL, counts: ZERO_COUNTS, docs: [] },
  drawer: { vehicles: VEHICLES, dl: DL, counts: COUNTS, drawer: true },
  'my-profile': { vehicles: VEHICLES, dl: DL, counts: COUNTS, screen: 'MyProfile' },
  'my-documents': { vehicles: VEHICLES, dl: DL, counts: COUNTS, screen: 'MyDocuments' },
  'share-access': { vehicles: VEHICLES, dl: DL, counts: COUNTS, screen: 'ShareAccess' },
  'share-access-empty': { vehicles: VEHICLES.slice(0, 1), dl: DL, counts: ZERO_COUNTS, screen: 'ShareAccess' },
  'add-vehicle': { vehicles: VEHICLES, dl: DL, counts: COUNTS, screen: 'AddVehicle' },
  'my-vehicles': { vehicles: VEHICLES, dl: DL, counts: COUNTS, screen: 'MyVehicles' },
};

export function getQaDashboardScenarioName(): string | null {
  if (!__DEV__ || Platform.OS !== 'ios') {
    return null;
  }
  const name = Settings.get('qaScenario');
  return typeof name === 'string' && name in QA_DASHBOARD_SCENARIOS ? name : null;
}

/** Extra cache entries a scenario needs (Part 4 screens add theirs here). */
export const qaSeeders: ((uid: string, s: Scenario) => void)[] = [];

function seed(s: Scenario) {
  // Seeded data only: queries with their own staleTime (0) would otherwise refetch for the fake user.
  onlineManager.setOnline(false);
  const fresh = { staleTime: Infinity, gcTime: Infinity };
  for (const key of [
    queryKeys.profileStep(UID),
    queryKeys.drivingLicenceStep(UID),
    queryKeys.myVehicles(UID),
    queryKeys.dashboardCounts(UID),
    queryKeys.sharedPeople(UID),
  ]) {
    queryClient.setQueryDefaults(key, fresh);
  }
  queryClient.setQueryData(queryKeys.profileStep(UID), s.profile ?? PROFILE);
  const ids = s.vehicles.map(v => v.id);
  const withDocs = s.vehiclesWithDocs ?? ids;
  const docCountsKey = queryKeys.vehicleDocumentCounts(UID, ids);
  queryClient.setQueryDefaults(docCountsKey, fresh);
  queryClient.setQueryData(docCountsKey, Object.fromEntries(ids.map(id => [id, withDocs.includes(id) ? 1 : 0])));
  queryClient.setQueryData(queryKeys.drivingLicenceStep(UID), s.dl);
  queryClient.setQueryData(queryKeys.myVehicles(UID), s.vehicles);
  queryClient.setQueryData(queryKeys.dashboardCounts(UID), s.counts);
  queryClient.setQueryData(queryKeys.sharedPeople(UID), s.counts.shares ? SHARED_PEOPLE : []);
  const docsKey = [...queryKeys.vehicleDocuments(UID), s.vehicles[0]?.id ?? null];
  queryClient.setQueryDefaults(docsKey, fresh);
  queryClient.setQueryData(docsKey, s.docs ?? DOCS);
  queryClient.setQueryDefaults(queryKeys.vehicleCatalog(), fresh);
  queryClient.setQueryData(queryKeys.vehicleCatalog(), QA_CATALOG);
  qaSeeders.forEach(f => f(UID, s));
  useAuthStore.setState({
    user: { id: UID, fullName: (s.profile ?? PROFILE).fullName, phone: '9876543210', roles: ['user'], permissions: [] },
  });
}

const navRef = createNavigationContainerRef();

export default function QaDashboard({ name }: { name: string }) {
  const theme = useTheme();
  const scenario = QA_DASHBOARD_SCENARIOS[name];
  const seeded = useRef(false);
  if (!seeded.current) {
    seed(scenario);
    seeded.current = true;
  }
  useEffect(() => {
    const t = setTimeout(() => {
      if (scenario.drawer) {
        navRef.dispatch(DrawerActions.openDrawer());
      } else if (scenario.screen) {
        // @ts-expect-error nested navigate from the root ref (dev only)
        navRef.navigate('Tabs', { screen: 'HomeTab', params: { screen: scenario.screen } });
      }
    }, 600);
    return () => clearTimeout(t);
  }, [scenario]);
  return (
    <NavigationContainer ref={navRef} theme={createNavigationTheme(theme)}>
      <MainNavigator />
    </NavigationContainer>
  );
}
