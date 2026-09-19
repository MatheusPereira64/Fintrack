import React, { memo, useMemo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme }          from '../../../hooks/useTheme';
import { useGoalStore }      from '../../../store/goalStore';
import { useBudgetStore }    from '../../../store/budgetStore';
import { AppHeader }         from '../../../components/AppHeader';
import { Icon }              from '../../../components/Icon';
import type { AppIconName }  from '../../../components/Icon';
import { useTabListPadding } from '../../../hooks/useScreenPadding';

interface MenuItem {
  icon:     AppIconName;
  label:    string;
  subtitle: string;
  route:    string;
  badge?:   number | string;
  color?:   string;
}

const MenuRow = memo(function MenuRow({
  item, onPress,
}: { item: MenuItem; onPress: () => void }) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      style={[{
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl,
        padding: spacing.base,
        marginBottom: spacing.sm,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
      }]}
    >
      <View style={[{
        width: 48, height: 48,
        borderRadius: borderRadius.lg,
        backgroundColor: `${item.color ?? colors.primary}18`,
        justifyContent: 'center', alignItems: 'center',
        marginRight: spacing.md,
      }]}>
        <Icon name={item.icon} size={22} color={item.color ?? colors.primary} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[typography.styles.titleSmall, { color: colors.text }]}>{item.label}</Text>
        <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
          {item.subtitle}
        </Text>
      </View>
      {item.badge !== undefined && (
        <View style={[{
          backgroundColor: colors.primary,
          borderRadius: borderRadius.full,
          minWidth: 22, height: 22,
          justifyContent: 'center', alignItems: 'center',
          paddingHorizontal: 6, marginRight: spacing.sm,
        }]}>
          <Text style={{ color: '#FFF', fontSize: 11, fontWeight: '700' }}>
            {item.badge}
          </Text>
        </View>
      )}
      <Icon name="forward" size={20} color={colors.textTertiary} />
    </TouchableOpacity>
  );
});

export function MoreMenuScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, typography } = useTheme();
  const listPad = useTabListPadding();
  const goals   = useGoalStore(s => s.goals);
  const budgets = useBudgetStore(s => s.budgets);

  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const overBudgets    = budgets.filter(b => b.spent > b.amount).length;

  const badgeMap: Record<string, number | string | undefined> = {
    Goals:   completedGoals > 0 ? `${completedGoals} ✓` : undefined,
    Budget:  overBudgets   > 0 ? overBudgets.toString() : undefined,
  };

  const menuItems: MenuItem[] = useMemo(() => [
    { icon: 'goal',     label: t('moreMenu.goals'),         subtitle: t('moreMenu.goalsSubtitle'),         route: 'Goals',         color: '#059669' },
    { icon: 'budget',   label: t('moreMenu.budgets'),       subtitle: t('moreMenu.budgetsSubtitle'),       route: 'Budget',        color: '#D97706' },
    { icon: 'insights', label: t('moreMenu.insights'),      subtitle: t('moreMenu.insightsSubtitle'),      route: 'Insights',      color: '#7C3AED' },
    { icon: 'bell',     label: t('moreMenu.notifications'), subtitle: t('moreMenu.notificationsSubtitle'), route: 'Notifications', color: '#2563EB' },
    { icon: 'category', label: t('moreMenu.categories'),    subtitle: t('moreMenu.categoriesSubtitle'),    route: 'Categories',    color: '#0891B2' },
    { icon: 'settings', label: t('moreMenu.settings'),      subtitle: t('moreMenu.settingsSubtitle'),      route: 'Settings',      color: '#6B7280' },
    { icon: 'import',   label: t('moreMenu.import'),        subtitle: t('moreMenu.importSubtitle'),        route: 'Import',        color: '#059669' },
  ], [t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={t('moreMenu.title')} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: listPad }}
        showsVerticalScrollIndicator={false}
      >
        {menuItems.map((item, i) => (
          <Animated.View key={item.route} entering={FadeInDown.delay(i * 50).duration(350)}>
            <MenuRow
              item={{ ...item, badge: badgeMap[item.route] }}
              onPress={() => navigation.navigate(item.route)}
            />
          </Animated.View>
        ))}

        {/* Versão */}
        <Text style={[typography.styles.caption, {
          color: colors.textTertiary,
          textAlign: 'center',
          marginTop: spacing.xl,
        }]}>
          {t('moreMenu.version', { version: '2.0.0' })}
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
