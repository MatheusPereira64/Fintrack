import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { createNativeStackNavigator }     from '@react-navigation/native-stack';
import { createBottomTabNavigator }        from '@react-navigation/bottom-tabs';
import { NavigationContainer }             from '@react-navigation/native';

import { useTheme }       from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';

// Stacks
import { AppTabParamList, RootStackParamList, TransactionStackParamList, AccountStackParamList, MoreStackParamList } from './types';

// Screens
import { OnboardingScreen }      from '../modules/onboarding/screens/OnboardingScreen';
import { DashboardScreen }       from '../modules/dashboard/screens/DashboardScreen';
import { TransactionsScreen }    from '../modules/transactions/screens/TransactionsScreen';
import { TransactionDetailScreen } from '../modules/transactions/screens/TransactionDetailScreen';
import { AddTransactionScreen }  from '../modules/transactions/screens/AddTransactionScreen';
import { AccountsScreen }        from '../modules/accounts/screens/AccountsScreen';
import { GoalsScreen }           from '../modules/goals/screens/GoalsScreen';
import { BudgetScreen }          from '../modules/budget/screens/BudgetScreen';
import { InsightsScreen }        from '../modules/insights/screens/InsightsScreen';
import { NotificationsScreen }   from '../modules/notifications/screens/NotificationsScreen';
import { SettingsScreen }        from '../modules/settings/screens/SettingsScreen';
import { PreferencesScreen }     from '../modules/settings/screens/PreferencesScreen';
import { ExportScreen }          from '../modules/settings/screens/ExportScreen';
import { MoreMenuScreen }        from '../modules/settings/screens/MoreMenuScreen';
import { CategoriesScreen }     from '../modules/categories/screens/CategoriesScreen';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab       = createBottomTabNavigator<AppTabParamList>();
const TxStack   = createNativeStackNavigator<TransactionStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function TransactionNavigator() {
  return (
    <TxStack.Navigator screenOptions={{ headerShown: false }}>
      <TxStack.Screen name="TransactionsList"  component={TransactionsScreen} />
      <TxStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <TxStack.Screen name="AddTransaction"    component={AddTransactionScreen} />
    </TxStack.Navigator>
  );
}

function MoreNavigator() {
  return (
    <MoreStack.Navigator screenOptions={{ headerShown: false }}>
      <MoreStack.Screen name="MoreMenu"      component={MoreMenuScreen} />
      <MoreStack.Screen name="Goals"         component={GoalsScreen} />
      <MoreStack.Screen name="Budget"        component={BudgetScreen} />
      <MoreStack.Screen name="Insights"      component={InsightsScreen} />
      <MoreStack.Screen name="Notifications" component={NotificationsScreen} />
      <MoreStack.Screen name="Settings"      component={SettingsScreen} />
      <MoreStack.Screen name="Preferences"   component={PreferencesScreen} />
      <MoreStack.Screen name="Export"        component={ExportScreen} />
      <MoreStack.Screen name="Categories"   component={CategoriesScreen} />
    </MoreStack.Navigator>
  );
}

function TabIcon({ emoji, label, focused, color }: { emoji: string; label: string; focused: boolean; color: string }) {
  return (
    <View style={tabStyles.iconWrapper}>
      <Text style={[tabStyles.emoji, focused && { transform: [{ scale: 1.1 }] }]}>{emoji}</Text>
      <Text style={[tabStyles.label, { color }]}>{label}</Text>
    </View>
  );
}

function AppTabs() {
  const { colors } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor:  colors.border,
          paddingBottom:   Platform.OS === 'ios' ? 20 : 8,
          paddingTop:      8,
          height:          Platform.OS === 'ios' ? 80 : 64,
        },
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🏠" label="Início" focused={focused} color={color} />
          ),
          tabBarActiveTintColor:   colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionNavigator}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="💸" label="Transações" focused={focused} color={color} />
          ),
          tabBarActiveTintColor:   colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
        }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="🏦" label="Contas" focused={focused} color={color} />
          ),
          tabBarActiveTintColor:   colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon emoji="☰" label="Mais" focused={focused} color={color} />
          ),
          tabBarActiveTintColor:   colors.tabBarActive,
          tabBarInactiveTintColor: colors.tabBarInactive,
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const { settings } = useSettingsStore();
  const { colors }   = useTheme();

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!settings.onboardingCompleted ? (
          <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
        ) : (
          <RootStack.Screen name="App" component={AppTabs} />
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  );
}

const tabStyles = StyleSheet.create({
  iconWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  emoji: {
    fontSize: 22,
  },
  label: {
    fontSize: 10,
    fontWeight: '500',
  },
});
