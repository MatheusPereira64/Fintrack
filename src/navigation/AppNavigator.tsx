import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator }     from '@react-navigation/native-stack';
import { createBottomTabNavigator }        from '@react-navigation/bottom-tabs';
import { NavigationContainer }             from '@react-navigation/native';

import { useTheme }        from '../hooks/useTheme';
import { useTabBarInsets } from '../hooks/useTabBarInsets';
import { useSettingsStore } from '../store/settingsStore';
import { Icon } from '../components/Icon';

// Stacks
import { AppTabParamList, RootStackParamList, TransactionStackParamList, AccountStackParamList, MoreStackParamList } from './types';
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
import { ImportScreen }         from '../modules/settings/screens/ImportScreen';

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
      <MoreStack.Screen name="Import"        component={ImportScreen} />
    </MoreStack.Navigator>
  );
}

function TabLabel({ label, color }: { label: string; color: string }) {
  return (
    <Text
      numberOfLines={1}
      adjustsFontSizeToFit
      minimumFontScale={0.75}
      style={[tabStyles.label, { color }]}
    >
      {label}
    </Text>
  );
}

function AppTabs() {
  const { colors } = useTheme();
  const { bottom: bottomInset, tabBarHeight } = useTabBarInsets();

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor:   colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBar,
          borderTopColor:  colors.border,
          borderTopWidth:  1,
          paddingBottom:   bottomInset,
          paddingTop:      6,
          height:          tabBarHeight,
        },
        tabBarItemStyle: {
          paddingTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: -2,
        },
        tabBarShowLabel: true,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Início" color={color} />,
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'home-active' : 'home'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionNavigator}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Transações" color={color} />,
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'transactions-active' : 'transactions'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsScreen}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Contas" color={color} />,
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'accounts-active' : 'accounts'} size={22} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          tabBarLabel: ({ color }) => <TabLabel label="Mais" color={color} />,
          tabBarIcon: ({ focused, color }) => (
            <Icon name={focused ? 'more-active' : 'more'} size={22} color={color} />
          ),
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
  label: {
    fontSize:   11,
    fontWeight: '500',
    textAlign:  'center',
    width:      '100%',
    maxWidth:   88,
    alignSelf:  'center',
  },
});
