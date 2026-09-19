import React, { memo, useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { Icon } from '../../../components/Icon';
import { formatCurrency } from '../../../utils/currency';
import { InsightService, FinanceSnapshot } from '../../../services/InsightService';

interface Props {
  refreshKey?: number;
}

/** Médias + projeção de resultado do mês — foco em controle financeiro. */
export const FinanceSnapshotCard = memo(function FinanceSnapshotCard({ refreshKey = 0 }: Props) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [snap, setSnap] = useState<FinanceSnapshot | null>(null);

  useEffect(() => {
    let active = true;
    InsightService.getFinanceSnapshot(6).then(s => {
      if (active) setSnap(s);
    }).catch(() => {});
    return () => { active = false; };
  }, [refreshKey]);

  if (!snap || (snap.avgIncome === 0 && snap.avgExpense === 0 && snap.curExpense === 0)) {
    return null;
  }

  const projectedPositive = snap.projectedBalance >= 0;

  return (
    <Animated.View
      entering={FadeInDown.duration(400)}
      style={[
        styles.wrap,
        {
          marginHorizontal: spacing.base,
          marginTop: spacing.base,
          backgroundColor: colors.card,
          borderRadius: borderRadius.xl,
          padding: spacing.base,
          ...shadows.sm,
        },
      ]}
    >
      <View style={styles.titleRow}>
        <Icon name="chart-line" size={18} color={colors.primary} />
        <Text style={[typography.styles.titleSmall, { color: colors.text, marginLeft: spacing.sm }]}>
          {t('financeSnapshot.title')}
        </Text>
      </View>

      <View style={[styles.row, { marginTop: spacing.md }]}>
        <Metric
          label={t('financeSnapshot.avgIncome')}
          value={formatCurrency(snap.avgIncome)}
          color={colors.income}
          icon="income"
        />
        <Metric
          label={t('financeSnapshot.avgExpense')}
          value={formatCurrency(snap.avgExpense)}
          color={colors.expense}
          icon="expense"
        />
        <Metric
          label={t('financeSnapshot.avgResult')}
          value={formatCurrency(snap.avgBalance)}
          color={snap.avgBalance >= 0 ? colors.income : colors.expense}
          icon={snap.avgBalance >= 0 ? 'trending-up' : 'trending-down'}
        />
      </View>

      <View style={[styles.projection, {
        backgroundColor: projectedPositive ? `${colors.success}12` : `${colors.error}12`,
        borderRadius: borderRadius.lg,
        marginTop: spacing.md,
        padding: spacing.md,
      }]}>
        <View style={styles.titleRow}>
          <Icon
            name={projectedPositive ? 'trending-up' : 'trending-down'}
            size={16}
            color={projectedPositive ? colors.success : colors.error}
          />
          <Text style={[typography.styles.labelLarge, {
            color: projectedPositive ? colors.success : colors.error,
            marginLeft: spacing.xs,
          }]}>
            {projectedPositive
              ? t('financeSnapshot.projectionProfit')
              : t('financeSnapshot.projectionLoss')}
          </Text>
        </View>
        <Text style={[typography.styles.titleMedium, {
          color: colors.text,
          marginTop: spacing.xs,
        }]}>
          {formatCurrency(snap.projectedBalance)}
        </Text>
        <Text style={[typography.styles.caption, { color: colors.textSecondary, marginTop: 2 }]}>
          {t('financeSnapshot.basedOnPace', { day: snap.dayOfMonth, total: snap.daysTotal })}
        </Text>
      </View>
    </Animated.View>
  );
});

function Metric({
  label, value, color, icon,
}: { label: string; value: string; color: string; icon: 'income' | 'expense' | 'trending-up' | 'trending-down' }) {
  const { colors, typography } = useTheme();
  return (
    <View style={styles.metric}>
      <Icon name={icon} size={14} color={color} />
      <Text style={[typography.styles.caption, { color: colors.textSecondary, marginTop: 4 }]}>
        {label}
      </Text>
      <Text style={[typography.styles.labelLarge, { color, marginTop: 2 }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {},
  titleRow: { flexDirection: 'row', alignItems: 'center' },
  row: { flexDirection: 'row', gap: 8 },
  metric: { flex: 1, alignItems: 'flex-start' },
  projection: {},
});
