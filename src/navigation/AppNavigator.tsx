import React from 'react';
import { Text, StyleSheet } from 'react-native';
import { createNativeStackNavigator }     from '@react-navigation/native-stack';
import { createBottomTabNavigator }        from '@react-navigation/bottom-tabs';
import { NavigationContainer, getFocusedRouteNameFromRoute, RouteProp } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { useTheme }        from '../hooks/useTheme';
import { useTabBarInsets } from '../hooks/useTabBarInsets';
import { useResponsive }   from '../hooks/useResponsive';
import { useReviewStore }  from '../store/reviewStore';
import { ContentColumn }   from '../components/ContentColumn';
import { useSettingsStore } from '../store/settingsStore';
import { Icon, AppIconName } from '../components/Icon';

// Stacks
import { AppTabParamList, RootStackParamList, TransactionStackParamList, AccountStackParamList, MoreStackParamList } from './types';
import { OnboardingScreen }      from '../modules/onboarding/screens/OnboardingScreen';
import { DashboardScreen }       from '../modules/dashboard/screens/DashboardScreen';
import { TransactionsScreen }    from '../modules/transactions/screens/TransactionsScreen';
import { TransactionDetailScreen } from '../modules/transactions/screens/TransactionDetailScreen';
import { AddTransactionScreen }  from '../modules/transactions/screens/AddTransactionScreen';
import { AccountsScreen }        from '../modules/accounts/screens/AccountsScreen';
import { AccountPlanScreen }     from '../modules/accounts/screens/AccountPlanScreen';
import { AccountCreditScreen }   from '../modules/accounts/screens/AccountCreditScreen';
import { GoalsScreen }           from '../modules/goals/screens/GoalsScreen';
import { BudgetScreen }          from '../modules/budget/screens/BudgetScreen';
import { InsightsScreen }        from '../modules/insights/screens/InsightsScreen';
import { NotificationsScreen }   from '../modules/notifications/screens/NotificationsScreen';
import { ReviewQueueScreen }     from '../modules/notifications/screens/ReviewQueueScreen';
import { ReviewDetailScreen }    from '../modules/notifications/screens/ReviewDetailScreen';
import { UnrecognizedInboxScreen } from '../modules/notifications/screens/UnrecognizedInboxScreen';
import { TeachPatternScreen }    from '../modules/notifications/screens/TeachPatternScreen';
import { SettingsScreen }        from '../modules/settings/screens/SettingsScreen';
import { UpdateDialog }          from '../components/UpdateDialog';
import { PreferencesScreen }     from '../modules/settings/screens/PreferencesScreen';
import { ExportScreen }          from '../modules/settings/screens/ExportScreen';
import { MoreMenuScreen }        from '../modules/settings/screens/MoreMenuScreen';
import { CategoriesScreen }     from '../modules/categories/screens/CategoriesScreen';
import { ImportScreen }         from '../modules/settings/screens/ImportScreen';
import { onColor } from '../utils/contrast';

const RootStack = createNativeStackNavigator<RootStackParamList>();
const Tab       = createBottomTabNavigator<AppTabParamList>();
const TxStack   = createNativeStackNavigator<TransactionStackParamList>();
const AccStack  = createNativeStackNavigator<AccountStackParamList>();
const MoreStack = createNativeStackNavigator<MoreStackParamList>();

function TransactionNavigator() {
  return (
    <TxStack.Navigator screenOptions={{ headerShown: false }}>
      <TxStack.Screen name="TransactionsList"  component={TransactionsScreen} />
      <TxStack.Screen name="TransactionDetail" component={TransactionDetailScreen} />
      <TxStack.Screen
        name="AddTransaction"
        component={AddTransactionScreen}
        options={{ animation: 'slide_from_bottom' }}
      />
    </TxStack.Navigator>
  );
}

function AccountsNavigator() {
  return (
    <AccStack.Navigator screenOptions={{ headerShown: false }}>
      <AccStack.Screen name="AccountsList"  component={AccountsScreen} />
      <AccStack.Screen name="AccountPlan"   component={AccountPlanScreen} />
      <AccStack.Screen name="AccountCredit" component={AccountCreditScreen} />
    </AccStack.Navigator>
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
      <MoreStack.Screen name="ReviewQueue"   component={ReviewQueueScreen} />
      <MoreStack.Screen name="ReviewDetail"  component={ReviewDetailScreen} />
      <MoreStack.Screen name="UnrecognizedInbox" component={UnrecognizedInboxScreen} />
      <MoreStack.Screen name="TeachPattern"  component={TeachPatternScreen} />
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

/** Formulários ocupam a tela toda: sem tab bar para não competir com o teclado e o salvar. */
const ROUTES_WITHOUT_TAB_BAR = new Set(['AddTransaction', 'ReviewDetail', 'TeachPattern']);

function isTabBarHidden(route: RouteProp<AppTabParamList>): boolean {
  const focused = getFocusedRouteNameFromRoute(route);
  return focused !== undefined && ROUTES_WITHOUT_TAB_BAR.has(focused);
}

function AppTabs() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { bottom: bottomInset, tabBarHeight } = useTabBarInsets();
  const { useSideNav } = useResponsive();
  const reviewCount = useReviewStore(s => s.pendingCount + s.unrecognizedCount);

  const tabOptions = (label: string, icon: AppIconName, activeIcon: AppIconName) => ({
    title: label,
    tabBarAccessibilityLabel: label,
    // Na barra lateral o rótulo padrão já acompanha o layout horizontal do item.
    ...(useSideNav
      ? {}
      : { tabBarLabel: ({ color }: { color: string }) => <TabLabel label={label} color={color} /> }),
    tabBarIcon: ({ focused, color }: { focused: boolean; color: string }) => (
      <Icon name={focused ? activeIcon : icon} size={22} color={color} />
    ),
  });

  return (
    <Tab.Navigator
      backBehavior="history"
      screenLayout={({ children }) => <ContentColumn>{children}</ContentColumn>}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor:   colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarPosition: useSideNav ? 'left' : 'bottom',
        tabBarVariant:  useSideNav ? 'material' : 'uikit',
        tabBarStyle: useSideNav
          ? { backgroundColor: colors.tabBar, borderRightColor: colors.border }
          : {
              backgroundColor: colors.tabBar,
              borderTopColor:  colors.border,
              borderTopWidth:  1,
              paddingBottom:   bottomInset,
              paddingTop:      6,
              height:          tabBarHeight,
              display:         isTabBarHidden(route) ? 'none' : 'flex',
            },
        tabBarItemStyle: useSideNav ? undefined : {
          paddingTop: 2,
        },
        tabBarIconStyle: useSideNav ? undefined : {
          marginBottom: -2,
        },
        tabBarShowLabel: true,
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={tabOptions(t('navigation.dashboard'), 'home', 'home-active')}
      />
      <Tab.Screen
        name="Transactions"
        component={TransactionNavigator}
        options={tabOptions(t('navigation.transactions'), 'transactions', 'transactions-active')}
      />
      <Tab.Screen
        name="Accounts"
        component={AccountsNavigator}
        options={tabOptions(t('navigation.accounts'), 'accounts', 'accounts-active')}
      />
      <Tab.Screen
        name="More"
        component={MoreNavigator}
        options={{
          ...tabOptions(t('navigation.more'), 'more', 'more-active'),
          tabBarBadge: reviewCount > 0 ? (reviewCount > 99 ? '99+' : reviewCount) : undefined,
          tabBarBadgeStyle: { backgroundColor: colors.error, color: onColor(colors.error) },
        }}
      />
    </Tab.Navigator>
  );
}

export function AppNavigator() {
  const onboardingCompleted = useSettingsStore(s => s.settings.onboardingCompleted);

  return (
    <>
      <NavigationContainer>
        <RootStack.Navigator screenOptions={{ headerShown: false }}>
          {!onboardingCompleted ? (
            <RootStack.Screen name="Onboarding" component={OnboardingScreen} />
          ) : (
            <RootStack.Screen name="App" component={AppTabs} />
          )}
        </RootStack.Navigator>
      </NavigationContainer>
      <UpdateDialog />
    </>
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
