import React, { memo, useEffect, useMemo, useCallback, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme }          from '../../../hooks/useTheme';
import { useGoalStore }      from '../../../store/goalStore';
import { useBudgetStore }    from '../../../store/budgetStore';
import { useReviewStore }    from '../../../store/reviewStore';
import { AppHeader }         from '../../../components/AppHeader';
import { Icon }              from '../../../components/Icon';
import type { AppIconName }  from '../../../components/Icon';
import { useTabListPadding } from '../../../hooks/useScreenPadding';
import { UpdateService }     from '../../../services/UpdateService';

interface MenuItem {
  icon:     AppIconName;
  label:    string;
  subtitle: string;
  route:    string;
  badge?:   number | string;
  color?:   string;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const MenuRow = memo(function MenuRow({
  item, onPress,
}: { item: MenuItem; onPress: () => void }) {
  const { colors, spacing, borderRadius, typography } = useTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={item.badge !== undefined ? `${item.label}, ${item.badge}` : item.label}
      accessibilityHint={item.subtitle}
      style={[{
        backgroundColor: colors.card,
        borderRadius: borderRadius.xl,
        padding: spacing.md,
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
        width: 44, height: 44,
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
  const pendingCount = useReviewStore(s => s.pendingCount);
  const unrecognizedCount = useReviewStore(s => s.unrecognizedCount);
  const refreshCounts = useReviewStore(s => s.refreshCounts);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  useEffect(() => {
    UpdateService.getLocalVersion()
      .then(v => setAppVersion(v.versionName))
      .catch(() => {});
  }, []);

  useFocusEffect(
    useCallback(() => {
      void refreshCounts();
    }, [refreshCounts]),
  );

  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const overBudgets    = budgets.filter(b => b.spent > b.amount).length;

  const badgeMap: Record<string, number | string | undefined> = {
    Goals:   completedGoals > 0 ? `${completedGoals} ✓` : undefined,
    Budget:  overBudgets   > 0 ? overBudgets.toString() : undefined,
    ReviewQueue: pendingCount > 0 ? pendingCount : undefined,
    UnrecognizedInbox: unrecognizedCount > 0 ? unrecognizedCount : undefined,
  };

  const sections: MenuSection[] = useMemo(() => [
    {
      title: t('moreMenu.sectionPlanning'),
      items: [
        { icon: 'goal',     label: t('moreMenu.goals'),    subtitle: t('moreMenu.goalsSubtitle'),    route: 'Goals',    color: '#059669' },
        { icon: 'budget',   label: t('moreMenu.budgets'),  subtitle: t('moreMenu.budgetsSubtitle'),  route: 'Budget',   color: '#D97706' },
        { icon: 'insights', label: t('moreMenu.insights'), subtitle: t('moreMenu.insightsSubtitle'), route: 'Insights', color: '#7C3AED' },
      ],
    },
    {
      title: t('moreMenu.sectionNotifications'),
      items: [
        { icon: 'check-circle', label: t('moreMenu.reviewQueue'), subtitle: t('moreMenu.reviewQueueSubtitle'), route: 'ReviewQueue', color: '#0D9488' },
        { icon: 'notification-dot', label: t('moreMenu.unrecognizedInbox'), subtitle: t('moreMenu.unrecognizedInboxSubtitle'), route: 'UnrecognizedInbox', color: '#EA580C' },
        { icon: 'bell',     label: t('moreMenu.notifications'), subtitle: t('moreMenu.notificationsSubtitle'), route: 'Notifications', color: '#2563EB' },
      ],
    },
    {
      title: t('moreMenu.sectionApp'),
      items: [
        { icon: 'category', label: t('moreMenu.categories'), subtitle: t('moreMenu.categoriesSubtitle'), route: 'Categories', color: '#0891B2' },
        { icon: 'import',   label: t('moreMenu.import'),     subtitle: t('moreMenu.importSubtitle'),     route: 'Import',     color: '#059669' },
        { icon: 'settings', label: t('moreMenu.settings'),   subtitle: t('moreMenu.settingsSubtitle'),   route: 'Settings',   color: '#6B7280' },
      ],
    },
  ], [t]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title={t('moreMenu.title')} />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: listPad }}
        showsVerticalScrollIndicator={false}
      >
        {sections.map((section, sectionIndex) => (
          <View key={section.title} style={{ marginTop: sectionIndex === 0 ? 0 : spacing.base }}>
            <Text
              accessibilityRole="header"
              style={[typography.styles.labelMedium, styles.sectionTitle, {
                color: colors.textSecondary,
                marginBottom: spacing.sm,
              }]}
            >
              {section.title}
            </Text>
            {section.items.map((item, i) => (
              <Animated.View
                key={item.route}
                entering={FadeInDown.delay((sectionIndex * section.items.length + i) * 50).duration(350)}
              >
                <MenuRow
                  item={{ ...item, badge: badgeMap[item.route] }}
                  onPress={() => navigation.navigate(item.route)}
                />
              </Animated.View>
            ))}
          </View>
        ))}

        {/* Versão */}
        {appVersion && (
          <Text style={[typography.styles.caption, {
            color: colors.textTertiary,
            textAlign: 'center',
            marginTop: spacing.xl,
          }]}>
            {t('moreMenu.version', { version: appVersion })}
          </Text>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  sectionTitle: { textTransform: 'uppercase', letterSpacing: 0.8 },
});
