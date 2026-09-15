import React, { useMemo, useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Polyline, Circle } from 'react-native-svg';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useAccountStore } from '../../../store/accountStore';
import { formatCurrency } from '../../../utils/currency';
import { simulateAccountPlan, PlanResult } from '../../../services/AccountPlanService';

const HORIZONS = [3, 6, 12] as const;
const STORAGE_KEY = (id: number) => `@fintrack/plan/${id}`;

export function AccountPlanScreen({ route, navigation }: any) {
  const { accountId } = route.params as { accountId: number };
  const { colors, spacing, borderRadius, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const account = useAccountStore(s => s.accounts.find(a => a.id === accountId));

  const baseBalance = account?.informedBalance ?? account?.balance ?? 0;

  const [income, setIncome] = useState('');
  const [expense, setExpense] = useState('');
  const [yieldRate, setYieldRate] = useState('0,5');
  const [months, setMonths] = useState<number>(6);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;
    (async () => {
      const raw = await AsyncStorage.getItem(STORAGE_KEY(account.id));
      if (cancelled) return;
      if (raw) {
        try {
          const saved = JSON.parse(raw);
          if (saved.income != null) setIncome(String(saved.income).replace('.', ','));
          if (saved.expense != null) setExpense(String(saved.expense).replace('.', ','));
          if (saved.yieldRate != null) {
            setYieldRate(String(saved.yieldRate).replace('.', ','));
          } else if (account.monthlyYieldRate != null) {
            setYieldRate(String(account.monthlyYieldRate).replace('.', ','));
          }
          if (saved.months) setMonths(saved.months);
        } catch { /* ignore */ }
      } else if (account.monthlyYieldRate != null) {
        setYieldRate(String(account.monthlyYieldRate).replace('.', ','));
      }
      setHydrated(true);
    })();
    return () => { cancelled = true; };
  }, [account?.id]);

  const parse = (v: string) => parseFloat(v.replace(/\./g, '').replace(',', '.')) || 0;

  const result: PlanResult = useMemo(() => simulateAccountPlan({
    startingBalance: baseBalance,
    monthlyIncome: parse(income),
    monthlyExpense: parse(expense),
    monthlyYieldRate: parse(yieldRate),
    months,
  }), [baseBalance, income, expense, yieldRate, months]);

  useEffect(() => {
    if (!account || !hydrated) return;
    AsyncStorage.setItem(STORAGE_KEY(account.id), JSON.stringify({
      income: parse(income),
      expense: parse(expense),
      yieldRate: parse(yieldRate),
      months,
    }));
  }, [account?.id, income, expense, yieldRate, months, hydrated]);

  if (!account) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <Text style={{ color: colors.textSecondary }}>Conta não encontrada</Text>
      </View>
    );
  }

  const chartW = 280;
  const chartH = 100;
  const balances = result.months.map(m => m.balance);
  const minB = Math.min(...balances, baseBalance);
  const maxB = Math.max(...balances, baseBalance);
  const range = maxB - minB || 1;
  const points = result.months.map((m, i) => {
    const x = (i / Math.max(result.months.length - 1, 1)) * (chartW - 16) + 8;
    const y = chartH - 8 - ((m.balance - minB) / range) * (chartH - 16);
    return `${x},${y}`;
  }).join(' ');

  const Field = ({
    label, value, onChange, hint,
  }: { label: string; value: string; onChange: (v: string) => void; hint?: string }) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
        {label}
      </Text>
      <TextInput
        value={value}
        onChangeText={onChange}
        keyboardType="decimal-pad"
        placeholder="0,00"
        placeholderTextColor={colors.placeholder}
        style={[{
          backgroundColor: colors.inputBackground,
          borderRadius: borderRadius.lg,
          padding: spacing.md,
          color: colors.inputText,
        }, typography.styles.bodyMedium]}
      />
      {hint ? (
        <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>{hint}</Text>
      ) : null}
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title="Planejamento"
        subtitle={account.name}
        onClose={() => navigation.goBack()}
      />

      <ScrollView
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          marginBottom: spacing.base,
        }]}>
          <Text style={[typography.styles.labelMedium, { color: colors.textSecondary }]}>
            Saldo base (informado)
          </Text>
          <Text style={[typography.styles.titleLarge, { color: colors.text, marginTop: 4 }]}>
            {formatCurrency(baseBalance)}
          </Text>
          <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>
            Simulação local — não cria transações reais
          </Text>
        </View>

        <Field label="Receita mensal simulada (R$)" value={income} onChange={setIncome} />
        <Field label="Despesa mensal simulada (R$)" value={expense} onChange={setExpense} />
        <Field
          label="Rendimento % a.m."
          value={yieldRate}
          onChange={setYieldRate}
          hint={
            account.monthlyYieldRate != null
              ? `Taxa cadastrada na conta: ${String(account.monthlyYieldRate).replace('.', ',')}% a.m.`
              : 'Ex.: 0,5 para poupança aproximada'
          }
        />

        <Text style={[typography.styles.labelLarge, { color: colors.textSecondary, marginBottom: spacing.xs }]}>
          Horizonte
        </Text>
        <View style={{ flexDirection: 'row', gap: 8, marginBottom: spacing.xl }}>
          {HORIZONS.map(h => {
            const sel = months === h;
            return (
              <TouchableOpacity
                key={h}
                onPress={() => setMonths(h)}
                style={{
                  flex: 1,
                  paddingVertical: 10,
                  borderRadius: borderRadius.lg,
                  backgroundColor: sel ? colors.primary : colors.surfaceVariant,
                  alignItems: 'center',
                }}
              >
                <Text style={[typography.styles.labelLarge, { color: sel ? '#FFF' : colors.textSecondary }]}>
                  {h} meses
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={[styles.card, {
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          marginBottom: spacing.base,
        }]}>
          <Text style={[typography.styles.titleSmall, { color: colors.text, marginBottom: spacing.md }]}>
            Projeção
          </Text>
          <View style={{ alignItems: 'center', marginBottom: spacing.md }}>
            <Svg width={chartW} height={chartH}>
              <Polyline
                points={points}
                fill="none"
                stroke={result.profitOrLoss >= 0 ? colors.success : colors.error}
                strokeWidth={2.5}
              />
              {result.months.map((m, i) => {
                const x = (i / Math.max(result.months.length - 1, 1)) * (chartW - 16) + 8;
                const y = chartH - 8 - ((m.balance - minB) / range) * (chartH - 16);
                return (
                  <Circle
                    key={m.month}
                    cx={x}
                    cy={y}
                    r={3}
                    fill={result.profitOrLoss >= 0 ? colors.success : colors.error}
                  />
                );
              })}
            </Svg>
          </View>

          <Metric label="Saldo final" value={formatCurrency(result.finalBalance)} color={colors.text} />
          <Metric
            label={result.profitOrLoss >= 0 ? 'Lucro no período' : 'Prejuízo no período'}
            value={formatCurrency(Math.abs(result.profitOrLoss))}
            color={result.profitOrLoss >= 0 ? colors.success : colors.error}
          />
          <Metric label="Total receitas" value={formatCurrency(result.totalIncome)} color={colors.income} />
          <Metric label="Total despesas" value={formatCurrency(result.totalExpense)} color={colors.expense} />
          <Metric label="Rendimentos" value={formatCurrency(result.totalYield)} color={colors.primary} />
        </View>

        <Text style={[typography.styles.titleSmall, { color: colors.text, marginBottom: spacing.sm }]}>
          Mês a mês
        </Text>
        {result.months.map(m => (
          <View
            key={m.month}
            style={[styles.row, {
              backgroundColor: colors.card,
              borderRadius: borderRadius.lg,
              padding: spacing.md,
              marginBottom: spacing.xs,
            }]}
          >
            <Text style={[typography.styles.labelLarge, { color: colors.text }]}>Mês {m.month}</Text>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
              {formatCurrency(m.balance)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function Metric({ label, value, color }: { label: string; value: string; color: string }) {
  const { typography, spacing } = useTheme();
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.sm }}>
      <Text style={[typography.styles.bodyMedium, { color }]}>{label}</Text>
      <Text style={[typography.styles.titleSmall, { color }]}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  card: {},
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
});
