import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Landmark,
  TrendingUp,
  Share2,
  Bell,
  Settings,
} from 'lucide-react-native';
import { colors, radii } from '../theme/theme';
import MemberDashboardScreen from '../screens/member/MemberDashboardScreen';
import MemberLoansScreen from '../screens/member/MemberLoansScreen';
import MemberInvestmentScreen from '../screens/member/MemberInvestmentScreen';
import MemberBusinessShareScreen from '../screens/member/MemberBusinessShareScreen';
import MemberNotificationsScreen from '../screens/member/MemberNotificationsScreen';
import MemberSettingsScreen from '../screens/member/MemberSettingsScreen';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MemberLoanDetailScreen from '../screens/member/MemberLoanDetailScreen';
import ApplyLoanScreen from '../screens/member/ApplyLoanScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function TabIcon({
  Icon,
  color,
  focused,
}: {
  Icon: any;
  color: string;
  focused: boolean;
}) {
  return (
    <View style={[styles.iconWrap, focused && styles.iconWrapActive]}>
      <Icon size={20} color={color} />
    </View>
  );
}

function MemberTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.secondary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: styles.tabBar,
        tabBarLabelStyle: styles.tabLabel,
        tabBarItemStyle: styles.tabItem,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={MemberDashboardScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Home} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Loans"
        component={MemberLoansScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Landmark} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Invest"
        component={MemberInvestmentScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={TrendingUp} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Shares"
        component={MemberBusinessShareScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Share2} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={MemberNotificationsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Bell} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Settings"
        component={MemberSettingsScreen}
        options={{
          tabBarIcon: ({ color, focused }) => (
            <TabIcon Icon={Settings} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function MemberNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="MemberTabs" component={MemberTabs} />
      <Stack.Screen name="LoanDetail" component={MemberLoanDetailScreen} />
      <Stack.Screen name="ApplyLoan" component={ApplyLoanScreen} />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    elevation: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.85)',
    borderRadius: radii['2xl'],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.05)',
    height: 65,
    paddingBottom: 8,
    paddingTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginTop: 2,
  },
  tabItem: {
    paddingVertical: 4,
  },
  iconWrap: {
    width: 36,
    height: 28,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapActive: {
    backgroundColor: colors.primary + '20',
  },
});
