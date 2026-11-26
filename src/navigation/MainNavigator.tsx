import React from 'react';
import { createBottomTabNavigator, type BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { createDrawerNavigator, type DrawerContentComponentProps } from '@react-navigation/drawer';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import DashboardScreen from '@/screens/app/DashboardScreen';
import ComingSoonScreen from '@/screens/common/ComingSoonScreen';
import AddVehicleScreen from '@/screens/vehicles/AddVehicleScreen';
import { useTheme } from '@/theme';
import DrawerContent from './DrawerContent';
import TabBar, { TABS } from './TabBar';
import type {
  DrawerParamList,
  HomeStackParamList,
  HomeStackScreenProps,
  TabParamList,
  TabScreenProps,
} from './types';
import { strings } from '@/constants/strings';
import { homeScreens } from './homeScreens';

const Drawer = createDrawerNavigator<DrawerParamList>();
const Tabs = createBottomTabNavigator<TabParamList>();
const Home = createNativeStackNavigator<HomeStackParamList>();

function ComingSoonRoute({ navigation, route }: HomeStackScreenProps<'ComingSoon'>) {
  return <ComingSoonScreen title={route.params.title} onBack={() => navigation.goBack()} />;
}

function AddVehicleRoute({ navigation }: HomeStackScreenProps<'AddVehicle'>) {
  return <AddVehicleScreen showActive onBack={() => navigation.goBack()} onSaved={() => navigation.goBack()} />;
}

/** The Home tab: the dashboard and the light screens opened from it or from the drawer (tabs stay). */
function HomeStack() {
  const { colors } = useTheme();
  const screens = homeScreens();
  return (
    <Home.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: colors.dashboard.background },
      }}
    >
      <Home.Screen name="Home" component={DashboardScreen} />
      <Home.Screen name="MyProfile" component={screens.MyProfile} />
      <Home.Screen name="DrivingLicence" component={screens.DrivingLicence} />
      <Home.Screen name="MyDocuments" component={screens.MyDocuments} />
      <Home.Screen name="UploadDocuments" component={screens.UploadDocuments} />
      <Home.Screen name="ShareAccess" component={screens.ShareAccess} />
      <Home.Screen name="MyVehicles" component={screens.MyVehicles} />
      <Home.Screen name="AddVehicle" component={AddVehicleRoute} />
      <Home.Screen name="ComingSoon" component={ComingSoonRoute} />
    </Home.Navigator>
  );
}

const comingSoonTab = (name: Exclude<keyof TabParamList, 'HomeTab'>) =>
  function ComingSoonTab(_: TabScreenProps<typeof name>) {
    return <ComingSoonScreen title={TABS[name].label} />;
  };
const ServicesTab = comingSoonTab('ServicesTab');
const RewardsTab = comingSoonTab('RewardsTab');
const DealersTab = comingSoonTab('DealersTab');
const HelpTab = comingSoonTab('HelpTab');

const renderTabBar = (props: BottomTabBarProps) => <TabBar {...props} />;
const renderDrawer = (props: DrawerContentComponentProps) => <DrawerContent {...props} />;

function TabsNavigator() {
  return (
    <Tabs.Navigator screenOptions={{ headerShown: false }} tabBar={renderTabBar}>
      <Tabs.Screen name="HomeTab" component={HomeStack} />
      <Tabs.Screen name="ServicesTab" component={ServicesTab} />
      <Tabs.Screen name="RewardsTab" component={RewardsTab} />
      <Tabs.Screen name="DealersTab" component={DealersTab} />
      <Tabs.Screen name="HelpTab" component={HelpTab} />
    </Tabs.Navigator>
  );
}

/** Signed-in home: side drawer (side-drawer.svg) → bottom tabs → Home stack. */
export default function MainNavigator() {
  const { colors } = useTheme();
  return (
    <Drawer.Navigator
      id={undefined}
      screenOptions={{
        headerShown: false,
        drawerType: 'front',
        overlayColor: colors.surface.scrimLight,
        drawerStyle: { width: 308, backgroundColor: colors.dashboard.drawer, borderTopRightRadius: 24, borderBottomRightRadius: 24 },
        swipeEdgeWidth: 24,
      }}
      drawerContent={renderDrawer}
    >
      <Drawer.Screen name="Tabs" component={TabsNavigator} options={{ title: strings.dashboard.title }} />
    </Drawer.Navigator>
  );
}
