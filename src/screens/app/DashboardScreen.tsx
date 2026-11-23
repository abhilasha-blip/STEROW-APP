import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { DrawerActions } from '@react-navigation/native';
import BookService from '@/assets/icons/dashboard/book-service.svg';
import Car from '@/assets/icons/dashboard/car.svg';
import Driver from '@/assets/icons/dashboard/driver.svg';
import File from '@/assets/icons/dashboard/file.svg';
import Folder from '@/assets/icons/dashboard/folder.svg';
import ShareAccess from '@/assets/icons/dashboard/share-access.svg';
import Wrench from '@/assets/icons/dashboard/wrench.svg';
import { strings } from '@/constants/strings';
import { useDashboard } from '@/hooks/api/useDashboard';
import type { HomeStackScreenProps } from '@/navigation/types';
import { useThemedStyles, type Theme } from '@/theme';
import DashboardHeader, { HEADER_HEIGHT } from '../dashboard/components/DashboardHeader';
import DashboardTile from '../dashboard/components/DashboardTile';
import HealthBanner from '../dashboard/components/HealthBanner';
import ProfilePendingBanner from '../dashboard/components/ProfilePendingBanner';
import QuickLinks from '../dashboard/components/QuickLinks';
import TaskRow from '../dashboard/components/TaskRow';
import VehicleCard from '../dashboard/components/VehicleCard';
import VehicleCarousel from '../dashboard/components/VehicleCarousel';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/store/auth.store';

const t = strings.dashboard;

/** TODO(backend): service history and challans have no API yet: static placeholders. */
const STATIC_COUNTS = { serviceHistory: 0, challans: 1 };

const fmt = (n: number | null) => (n === null ? t.unknownCount : String(n));

/**
 * User Dashboard (design/dashboard/dashboard.svg, dashboard-incomplete*.svg).
 * - complete: vehicle carousel → tile grid → health banner → Quick Links
 * - incomplete (profile / licence / vehicle missing): lime "Your Profile info pending" banner first; with
 *   no vehicle, the "N/A" card + task list (variant 2) replaces the carousel + grid. (Variant 1, the grid
 *   with 0 counts, is shown for an incomplete profile that has a vehicle.)
 * Counts: vehicles, documents, shares and bookings are real; service history and challans are TODO.
 */
export default function DashboardScreen({ navigation }: HomeStackScreenProps<'Home'>) {
  const styles = useThemedStyles(makeStyles);
  const data = useDashboard();
  const queryClient = useQueryClient();
  const uid = useAuthStore(s => s.user?.id);
  const [refreshing, setRefreshing] = React.useState(false);
  const hasVehicle = data.vehicles.length > 0;
  const comingSoon = (title: string) => navigation.navigate('ComingSoon', { title });
  const showBanner = !data.loading && data.completion.percent < 100;
  const vehicleCount = fmt(data.loading ? null : data.vehicles.length);

  return (
    <View testID="dashboard" style={styles.root}>
      <ScrollView
        style={styles.flex}
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await queryClient.invalidateQueries({ predicate: q => q.queryKey.includes(uid ?? '') });
              setRefreshing(false);
            }}
          />
        }
      >
        <DashboardHeader
          firstName={data.firstName}
          email={data.email}
          onMenu={() => navigation.dispatch(DrawerActions.openDrawer())}
          onBell={() => comingSoon(strings.dashboard.notificationsA11y)}
          onSos={() => comingSoon(strings.dashboard.sosA11y)}
        />
        <View style={styles.sheet}>
          {showBanner && (
            <View style={styles.inset}>
              <ProfilePendingBanner
                percent={data.completion.percent}
                onPress={() =>
                  data.completion.nextStep &&
                  navigation.navigate('Onboarding', { screen: data.completion.nextStep })
                }
              />
            </View>
          )}

          {hasVehicle ? (
            <View style={showBanner ? styles.afterBanner : undefined}>
              <VehicleCarousel vehicles={data.vehicles} onOpen={() => navigation.navigate('MyVehicles')} />
            </View>
          ) : (
            <VehicleCard
              testID="vehicle-placeholder"
              style={[styles.inset, showBanner && styles.afterBanner]}
              placeholder
              title={t.noVehicleTitle}
              subtitle={t.noVehicleSubtitle}
              onPress={() => navigation.navigate('AddVehicle')}
            />
          )}

          {hasVehicle || data.loading ? (
            <View testID="dashboard-tiles" style={[styles.inset, styles.grid]}>
              <View style={styles.gridRow}>
                <DashboardTile
                  testID="tile-vehicles"
                  icon={Car}
                  title={t.tiles.vehicles}
                  count={t.available(vehicleCount)}
                  onPress={() => navigation.navigate('MyVehicles')}
                />
                <DashboardTile
                  testID="tile-share-access"
                  icon={ShareAccess}
                  title={t.tiles.shareAccess}
                  count={t.available(fmt(data.counts.shares))}
                  onPress={() => navigation.navigate('ShareAccess')}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardTile
                  testID="tile-book-service"
                  icon={BookService}
                  title={t.tiles.bookService}
                  count={t.records(fmt(data.counts.bookings))}
                  disabled={!hasVehicle}
                  onPress={() => comingSoon(t.tiles.bookService)}
                />
                <DashboardTile
                  testID="tile-service-history"
                  icon={Wrench}
                  title={t.tiles.serviceHistory}
                  count={t.records(String(STATIC_COUNTS.serviceHistory))}
                  onPress={() => comingSoon(t.tiles.serviceHistory)}
                />
              </View>
              <View style={styles.gridRow}>
                <DashboardTile
                  testID="tile-documents"
                  icon={Folder}
                  title={t.tiles.documents}
                  count={t.available(fmt(data.counts.documents))}
                  onPress={() => navigation.navigate('MyDocuments')}
                />
                <DashboardTile
                  testID="tile-challans"
                  icon={File}
                  title={t.tiles.challans}
                  count={t.pending(String(STATIC_COUNTS.challans))}
                  alert={STATIC_COUNTS.challans > 0}
                  onPress={() => comingSoon(t.tiles.challans)}
                />
              </View>
            </View>
          ) : (
            <View testID="dashboard-tasks" style={[styles.inset, styles.tasks]}>
              <TaskRow
                testID="task-service-history"
                icon={Wrench}
                title={t.tasks.serviceHistory}
                subtitle={t.tasks.serviceHistorySubtitle}
                onPress={() => comingSoon(t.tasks.serviceHistory)}
              />
              <TaskRow
                testID="task-documents"
                icon={Folder}
                title={t.tasks.documents}
                subtitle={t.tasks.documentsSubtitle}
                onPress={() => navigation.navigate('MyDocuments')}
              />
              <TaskRow
                testID="task-drivers"
                icon={Driver}
                title={t.tasks.drivers}
                subtitle={t.tasks.driversSubtitle}
                onPress={() => navigation.navigate('ShareAccess')}
              />
            </View>
          )}

          <View style={[styles.inset, styles.health]}>
            <HealthBanner onPress={() => comingSoon(t.health.title.replace('\n', ' '))} />
          </View>
          <View style={[styles.inset, styles.quick]}>
            <QuickLinks
              onOpen={key => comingSoon(t.quickLinks[key].replace('\n', ' '))}
              onViewAll={() => comingSoon(t.quickLinks.title)}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

/* dashboard.svg: the light sheet starts at y 222 (r20), content at 24pt sides, blocks 16–24pt apart. */
const makeStyles = ({ colors, radius }: Theme) =>
  StyleSheet.create({
    root: { flex: 1, backgroundColor: colors.dashboard.background },
    flex: { flex: 1 },
    scroll: { backgroundColor: colors.dashboard.headerBase, flexGrow: 1 },
    sheet: {
      flexGrow: 1,
      marginTop: -24,
      paddingTop: 24,
      paddingBottom: 24,
      borderTopLeftRadius: radius.sheet,
      borderTopRightRadius: radius.sheet,
      backgroundColor: colors.dashboard.background,
      minHeight: HEADER_HEIGHT,
    },
    inset: { marginHorizontal: 24 },
    afterBanner: { marginTop: 24 },
    grid: { marginTop: 24, gap: 16 },
    gridRow: { flexDirection: 'row', gap: 16 },
    tasks: { marginTop: 24, gap: 16 },
    health: { marginTop: 24 },
    quick: { marginTop: 30 },
  });
