import React, { memo } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Platform, StatusBar,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTheme }          from '../../../hooks/useTheme';
import { useGoalStore }      from '../../../store/goalStore';
import { useBudgetStore }    from '../../../store/budgetStore';

interface MenuItem {
  icon:     string;
  label:    string;
  subtitle: string;
  route:    string;
  badge?:   number | string;
  color?:   string;
}

const MENU_ITEMS: MenuItem[] = [
  { icon: '🎯', label: 'Metas',          subtitle: 'Acompanhe seus objetivos financeiros', route: 'Goals'         },
  { icon: '📊', label: 'Orçamentos',     subtitle: 'Controle seus limites de gastos',      route: 'Budget'        },
  { icon: '💡', label: 'Insights',       subtitle: 'Análise automática das suas finanças', route: 'Insights'      },
  { icon: '🔔', label: 'Notificações',   subtitle: 'Alertas e avisos do sistema',          route: 'Notifications' },
  { icon: '🏷️', label: 'Categorias',     subtitle: 'Gerencie e crie categorias',           route: 'Categories'    },
  { icon: '⚙️', label: 'Configurações',  subtitle: 'Tema, notificações e exportação',      route: 'Settings'      },
];

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
        <Text style={{ fontSize: 22 }}>{item.icon}</Text>
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
      <Text style={{ color: colors.textTertiary, fontSize: 18 }}>›</Text>
    </TouchableOpacity>
  );
});

export function MoreMenuScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, typography } = useTheme();
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
      <StatusBar barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'} />

      {/* Header */}
      <View style={[{
        backgroundColor:   colors.header,
        paddingTop:        Platform.OS === 'android' ? 48 : 56,
        paddingHorizontal: spacing.base,
        paddingBottom:     spacing.base,
        borderBottomWidth: 1,
        borderBottomColor: colors.borderLight,
      }]}>
        <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>Mais</Text>
      </View>

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
