import React, { memo } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme }          from '../../../hooks/useTheme';
import { useGoalStore }      from '../../../store/goalStore';
import { useBudgetStore }    from '../../../store/budgetStore';
import { AppHeader }         from '../../../components/AppHeader';
import { Icon }              from '../../../components/Icon';
import type { AppIconName }  from '../../../components/Icon';

interface MenuItem {
  icon:     AppIconName;
  label:    string;
  subtitle: string;
  route:    string;
  badge?:   number | string;
  color?:   string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: 'goal',     label: 'Metas',         subtitle: 'Acompanhe seus objetivos financeiros', route: 'Goals',         color: '#059669' },
  { icon: 'budget',   label: 'Orçamentos',    subtitle: 'Controle seus limites de gastos',      route: 'Budget',        color: '#D97706' },
  { icon: 'insights', label: 'Insights',      subtitle: 'Análise automática das suas finanças', route: 'Insights',      color: '#7C3AED' },
  { icon: 'bell',     label: 'Notificações',  subtitle: 'Alertas e avisos do sistema',          route: 'Notifications', color: '#2563EB' },
  { icon: 'category', label: 'Categorias',    subtitle: 'Gerencie e crie categorias',           route: 'Categories',    color: '#0891B2' },
  { icon: 'settings', label: 'Configurações', subtitle: 'Tema, notificações e exportação',      route: 'Settings',      color: '#6B7280' },
  { icon: 'import',   label: 'Importar extrato', subtitle: 'Importe OFX ou CSV do seu banco', route: 'Import',        color: '#059669' },
];

const MenuRow = memo(function MenuRow({
  item, onPress,
}: { item: MenuItem; onPress: () => void }) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();

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
  const { colors, spacing, borderRadius, typography } = useTheme();
  const insets = useSafeAreaInsets();
  const { goals }   = useGoalStore();
  const { budgets } = useBudgetStore();

  const completedGoals = goals.filter(g => g.currentAmount >= g.targetAmount).length;
  const overBudgets    = budgets.filter(b => b.spent > b.amount).length;

  const badgeMap: Record<string, number | string | undefined> = {
    Goals:   completedGoals > 0 ? `${completedGoals} ✓` : undefined,
    Budget:  overBudgets   > 0 ? overBudgets.toString() : undefined,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader title="Mais" />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {MENU_ITEMS.map((item, i) => (
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
          FinTrack v2.0.0 · Monitor Financeiro Inteligente
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
