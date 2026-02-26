import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import {
  Home,
  Landmark,
  CreditCard,
  Send,
  Settings,
  TrendingUp,
  Share2,
  Bell,
} from 'lucide-react-native';
import { colors } from '../theme/theme';
import MemberDashboardScreen from '../screens/member/MemberDashboardScreen';
import MemberLoansScreen from '../screens/member/MemberLoansScreen';

import MemberInvestmentScreen from '../screens/member/MemberInvestmentScreen';
import MemberBusinessShareScreen from '../screens/member/MemberBusinessShareScreen';
import MemberNotificationsScreen from '../screens/member/MemberNotificationsScreen';
import MemberSettingsScreen from '../screens/member/MemberSettingsScreen';

// import MemberDashboardScreen from '../screens/member/MemberDashboardScreen';

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MemberLoanDetailScreen from '../screens/member/MemberLoanDetailScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

function MemberTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.text.muted,
        tabBarStyle: {
          backgroundColor: colors.background.card,
          borderTopColor: colors.border,
        },
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={MemberDashboardScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Loans"
        component={MemberLoansScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Landmark color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Invest"
        component={MemberInvestmentScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <TrendingUp color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Shares"
        component={MemberBusinessShareScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Share2 color={color} size={size} />,
        }}
      />
      <Tab.Screen
        name="Alerts"
        component={MemberNotificationsScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Bell color={color} size={size} />,
          tabBarBadge: '!',
        }}
      />
      <Tab.Screen
        name="Settings"
        component={MemberSettingsScreen}
        options={{
          tabBarIcon: ({ color, size }) => (
            <Settings color={color} size={size} />
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
    </Stack.Navigator>
  );
}
