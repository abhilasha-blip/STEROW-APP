import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { SvgProps } from 'react-native-svg';
import Gift from '@/assets/icons/dashboard/gift.svg';
import Handshake from '@/assets/icons/dashboard/handshake.svg';
import Headset from '@/assets/icons/dashboard/headset.svg';
import Home from '@/assets/icons/dashboard/home.svg';
import Wrench from '@/assets/icons/dashboard/wrench.svg';
import AppText from '@/components/AppText';
import { strings } from '@/constants/strings';
import { useTheme, useThemedStyles, type Theme } from '@/theme';
import type { TabParamList } from './types';

export const TABS: Record<keyof TabParamList, { label: string; icon: React.FC<SvgProps> }> = {
  HomeTab: { label: strings.tabs.home, icon: Home },
  ServicesTab: { label: strings.tabs.services, icon: Wrench },
  RewardsTab: { label: strings.tabs.rewards, icon: Gift },
  DealersTab: { label: strings.tabs.dealers, icon: Handshake },
  HelpTab: { label: strings.tabs.help, icon: Headset },
};

/**
 * dashboard.svg tab bar: white, 1pt top border; the active tab has a 36pt violet circle with a white icon,
 * a SemiBold label and a 3pt violet bar above it; others are slate.
 */
export default function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  return (
    <View testID="tab-bar" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {state.routes.map((route, index) => {
        const focused = state.index === index;
        const { label, icon: Icon } = TABS[route.name as keyof TabParamList];
        return (
          <Pressable
            key={route.key}
            testID={`tab-${route.name}`}
            accessibilityRole="tab"
            accessibilityState={{ selected: focused }}
            accessibilityLabel={label}
            style={styles.item}
            onPress={() => {
              const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
              if (!event.defaultPrevented) {
                // Home pops back to the dashboard when already selected.
                navigation.navigate(route.name, route.name === 'HomeTab' ? { screen: 'Home' } : undefined);
              }
            }}
          >
            <View style={[styles.indicator, focused && styles.indicatorActive]} />
            <View style={[styles.iconCircle, focused && styles.iconCircleActive]}>
              <Icon width={22} height={22} color={focused ? colors.dashboard.tabActiveIcon : colors.dashboard.tabInactive} />
            </View>
            <AppText
              variant={focused ? 'tabActive' : 'tab'}
              color={focused ? 'dashboard.tabActiveLabel' : 'dashboard.tabInactive'}
              numberOfLines={1}
              style={styles.label}
            >
              {label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = ({ colors }: Theme) =>
  StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: colors.dashboard.tabBar,
      borderTopWidth: 1,
      borderTopColor: colors.dashboard.tabBarBorder,
      paddingHorizontal: 12,
    },
    item: { flex: 1, alignItems: 'center' },
    indicator: { width: 58, height: 3, borderRadius: 1.5, marginBottom: 14 },
    indicatorActive: { backgroundColor: colors.dashboard.tabIndicator },
    iconCircle: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
    iconCircleActive: { backgroundColor: colors.dashboard.tabActiveCircle },
    label: { marginTop: 6 },
  });
