import React, { useEffect, useCallback, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, Platform, StatusBar,
} from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTabBarInsets } from '../../../hooks/useTabBarInsets';

import { useTheme }             from '../../../hooks/useTheme';
import { useTransactionStore }  from '../../../store/transactionStore';
import { useAccountStore }      from '../../../store/accountStore';
import { useSettingsStore }     from '../../../store/settingsStore';
import { useBudgetStore }       from '../../../store/budgetStore';
import { NotificationManager, TransactionEvent } from '../../../services/NotificationManager';
import { InsightService }       from '../../../services/InsightService';

import { BalanceCard }    from '../components/BalanceCard';
import { SpendingChart }  from '../components/SpendingChart';
import { CategoryChart }  from '../components/CategoryChart';
import { TransactionItem } from '../../../components/TransactionItem';

import { subtractMonths, addMonths } from '../../../utils/date';
import { formatCurrency }           from '../../../utils/currency';

export function DashboardScreen({ navigation }: any) {
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const { bottom: tabBarBottom, top: safeTop } = useTabBarInsets();

  const {
    transactions, summary, currentMonth, categorySpending,
    monthlyTotals, isLoading, loadByMonth, loadMonthlyTotals,
  } = useTransactionStore();

  const { accounts, totalBalance, loadAccounts } = useAccountStore();
  const { settings }   = useSettingsStore();
  const { syncSpent }  = useBudgetStore();

  const [insights, setInsights] = useState<any[]>([]);
  const [toast, setToast]       = useState<{ message: string; amount: number } | null>(null);

  const currentDate = useMemo(
    () => new Date(currentMonth.year, currentMonth.month - 1, 1),
    [currentMonth],
  );

  // ── Observador do singleton de notificações ───────────────────────────────
  const onTransaction = useCallback((ev: TransactionEvent) => {
    setToast({ message: ev.description, amount: ev.amount });
    loadByMonth(currentMonth.year, currentMonth.month);
    loadAccounts();
    setTimeout(() => setToast(null), 4000);
  }, [currentMonth, loadByMonth, loadAccounts]);

  useEffect(() => {
    NotificationManager.addObserver(onTransaction);
    return () => NotificationManager.removeObserver(onTransaction);
  }, [onTransaction]);

  // ── Carregamento inicial ───────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      await Promise.all([
        loadByMonth(currentMonth.year, currentMonth.month),
        loadAccounts(),
        loadMonthlyTotals(),
      ]);
      const generated = await InsightService.generateAndSave();
      setInsights(generated.slice(0, 3));
    };
    init();
  }, []);

  const onRefresh = useCallback(async () => {
    await Promise.all([
      loadByMonth(currentMonth.year, currentMonth.month),
      loadAccounts(),
      loadMonthlyTotals(),
    ]);
    await syncSpent(currentMonth.year, currentMonth.month);
    const generated = await InsightService.generateAndSave();
    setInsights(generated.slice(0, 3));
  }, [currentMonth]);

  // ── Navegação de mês ───────────────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    const prev = subtractMonths(currentDate, 1);
    loadByMonth(prev.getFullYear(), prev.getMonth() + 1);
  }, [currentDate, loadByMonth]);

  const goToNextMonth = useCallback(() => {
    const next = addMonths(currentDate, 1);
    if (next <= new Date()) {
      loadByMonth(next.getFullYear(), next.getMonth() + 1);
    }
  }, [currentDate, loadByMonth]);

  const recentTransactions = useMemo(() => transactions.slice(0, 6), [transactions]);

  const SEVERITY_COLORS: Record<string, string> = {
    info:     colors.info,
    warning:  colors.warning,
    critical: colors.error,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={colors.text === '#111827' ? 'dark-content' : 'light-content'}
        backgroundColor={colors.background}
        translucent
      />

      {/* Toast de transação automática */}
      {toast && (
        <Animated.View
          entering={FadeInDown.duration(300)}
          style={[
            styles.toast,
            {
              backgroundColor: colors.primary,
              top: Platform.OS === 'android' ? 56 : 60,
              borderRadius: borderRadius.lg,
              marginHorizontal: spacing.base,
            },
          ]}
        >
          <Text style={{ fontSize: 16 }}>🤖</Text>
          <View style={{ flex: 1, marginLeft: spacing.sm }}>
            <Text style={[typography.styles.labelLarge, { color: '#FFF' }]}>
              Transação registrada
            </Text>
            <Text style={[typography.styles.bodySmall, { color: 'rgba(255,255,255,0.85)' }]} numberOfLines={1}>
              {toast.message} · {formatCurrency(toast.amount)}
            </Text>
          </View>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: safeTop + (Platform.OS === 'android' ? 12 : 8),
          paddingBottom: 88 + tabBarBottom,
        }}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Saudação */}
        <View style={[styles.greeting, { paddingHorizontal: spacing.base, marginBottom: spacing.md }]}>
          <View>
            <Text style={[typography.styles.bodyMedium, { color: colors.textSecondary }]}>
              {settings.userName ? `Olá, ${settings.userName} 👋` : 'Olá 👋'}
            </Text>
            <Text style={[typography.styles.headlineSmall, { color: colors.text }]}>
              Resumo financeiro
            </Text>
          </View>
          {/* Badge de monitoramento */}
          <TouchableOpacity
            style={[
              styles.monitorBadge,
              {
                backgroundColor: settings.notificationPermissionGranted
                  ? `${colors.success}20` : `${colors.warning}20`,
                borderRadius: borderRadius.full,
                borderWidth: 1,
                borderColor: settings.notificationPermissionGranted ? colors.success : colors.warning,
              },
            ]}
          >
            <Text style={{ fontSize: 10 }}>
              {settings.notificationPermissionGranted ? '🟢' : '🟡'}
            </Text>
            <Text style={[
              typography.styles.caption,
              { color: settings.notificationPermissionGranted ? colors.success : colors.warning, marginLeft: 4 },
            ]}>
              {settings.notificationPermissionGranted ? 'Ativo' : 'Inativo'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Card de saldo principal */}
        <BalanceCard
          totalBalance={totalBalance}
          income={summary.income}
          expense={summary.expense}
          count={summary.count}
          currentDate={currentDate}
          onPrevMonth={goToPrevMonth}
          onNextMonth={goToNextMonth}
        />

        {/* Gráfico de barras mensais */}
        {monthlyTotals.length > 0 && (
          <View style={{ marginTop: spacing.xl }}>
            <SpendingChart data={monthlyTotals} />
          </View>
        )}

        {/* Gráfico de categorias */}
        {categorySpending.length > 0 && (
          <View style={{ marginTop: spacing.base }}>
            <CategoryChart data={categorySpending} />
          </View>
        )}

        {/* Insights */}
        {insights.length > 0 && (
          <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.xl }}>
            <Text style={[typography.styles.titleLarge, { color: colors.text, marginBottom: spacing.md }]}>
              💡 Insights
            </Text>
            {insights.map((insight, i) => (
              <Animated.View
                key={i}
                entering={FadeInDown.delay(i * 80).duration(400)}
                style={[
                  styles.insightCard,
                  {
                    backgroundColor: colors.card,
                    borderRadius:    borderRadius.lg,
                    borderLeftWidth: 3,
                    borderLeftColor: SEVERITY_COLORS[insight.severity] ?? colors.primary,
                    padding:         spacing.base,
                    marginBottom:    spacing.sm,
                    ...shadows.sm,
                  },
                ]}
              >
                <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
                  {insight.title}
                </Text>
                <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]}>
                  {insight.description}
                </Text>
              </Animated.View>
            ))}
          </View>
        )}

        {/* Últimas transações */}
        <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.xl }}>
          <View style={styles.sectionHeader}>
            <Text style={[typography.styles.titleLarge, { color: colors.text }]}>
              Últimas movimentações
            </Text>
            <TouchableOpacity
              onPress={() => navigation.navigate('Transactions')}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={[typography.styles.labelLarge, { color: colors.primary }]}>
                Ver todas →
              </Text>
            </TouchableOpacity>
          </View>

          {recentTransactions.length === 0 ? (
            <View style={[
              styles.empty,
              { backgroundColor: colors.surfaceVariant, borderRadius: borderRadius.xl, padding: spacing.xl },
            ]}>
              <Text style={{ fontSize: 40, textAlign: 'center' }}>🔔</Text>
              <Text style={[typography.styles.titleSmall, { color: colors.text, textAlign: 'center', marginTop: spacing.sm }]}>
                Nenhuma transação ainda
              </Text>
              <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs }]}>
                Quando você receber uma notificação do banco, ela aparecerá aqui automaticamente.
              </Text>
            </View>
          ) : (
            recentTransactions.map((tx, idx) => (
              <TransactionItem
                key={tx.id}
                transaction={tx}
                showDate
                index={idx}
                onPress={() => navigation.navigate('Transactions', {
                  screen: 'TransactionDetail', params: { transactionId: tx.id },
                })}
              />
            ))
          )}
        </View>

        {/* Cards de contas */}
        {accounts.length > 0 && (
          <View style={{ paddingHorizontal: spacing.base, marginTop: spacing.xl }}>
            <View style={styles.sectionHeader}>
              <Text style={[typography.styles.titleLarge, { color: colors.text }]}>
                Suas contas
              </Text>
              <TouchableOpacity onPress={() => navigation.navigate('Accounts')}>
                <Text style={[typography.styles.labelLarge, { color: colors.primary }]}>
                  Gerenciar →
                </Text>
              </TouchableOpacity>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -spacing.base }}>
              <View style={{ flexDirection: 'row', paddingHorizontal: spacing.base, gap: spacing.sm }}>
                {accounts.map(acc => (
                  <View
                    key={acc.id}
                    style={[{
                      backgroundColor: acc.color,
                      borderRadius: borderRadius.xl,
                      padding: spacing.base,
                      minWidth: 160,
                    }]}
                  >
                    <View style={[{ backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: borderRadius.full, width: 36, height: 36, justifyContent: 'center', alignItems: 'center', marginBottom: spacing.sm }]}>
                      <Text style={{ fontSize: 18 }}>🏦</Text>
                    </View>
                    <Text style={[typography.styles.labelSmall, { color: 'rgba(255,255,255,0.8)' }]}>
                      {acc.name}
                    </Text>
                    <Text style={[typography.styles.titleMedium, { color: '#FFF', marginTop: 2 }]}>
                      {formatCurrency(acc.balance)}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1 },
  greeting:     { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  monitorBadge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
  toast: {
    position:       'absolute',
    zIndex:         999,
    left:           0, right: 0,
    flexDirection:  'row',
    alignItems:     'center',
    padding:        12,
    shadowColor:    '#000',
    shadowOffset:   { width: 0, height: 4 },
    shadowOpacity:  0.2,
    shadowRadius:   8,
    elevation:      10,
  },
  insightCard:   {},
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  empty:         { alignItems: 'center' },
});
