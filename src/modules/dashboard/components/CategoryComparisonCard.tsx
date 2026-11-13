import React, { memo, useEffect, useMemo, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { Icon } from '../../../components/Icon';
import { TransactionRepository } from '../../../database/repositories/TransactionRepository';
import { formatCurrency, formatPercent } from '../../../utils/currency';
import { CategoryTotal, compareCategorySpending } from '../../../utils/categoryComparison';
import { subtractMonths } from '../../../utils/date';

interface Props {
  current:     CategoryTotal[];
  currentDate: Date;
  /** Muda quando os dados do mês são recarregados. */
  refreshKey?: number;
}

/** Quanto cada categoria variou em relação ao mês anterior. */
export const CategoryComparisonCard = memo(function CategoryComparisonCard({
  current, currentDate, refreshKey = 0,
}: Props) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography, shadows } = useTheme();
  const [previous, setPrevious] = useState<CategoryTotal[] | null>(null);

  useEffect(() => {
    let active = true;
    const prev = subtractMonths(currentDate, 1);
    TransactionRepository.spendingByCategory(prev.getFullYear(), prev.getMonth() + 1)
      .then(rows => { if (active) setPrevious(rows); })
      .catch(() => { if (active) setPrevious([]); });
    return () => { active = false; };
  }, [currentDate, refreshKey]);

  const changes = useMemo(
    () => (previous ? compareCategorySpending(current, previous) : []),
    [current, previous],
  );

  if (!previous || previous.length === 0 || changes.length === 0) return null;

  return (
    <Animated.View
      entering={FadeInUp.delay(350).duration(500)}
      style={[styles.card, {
        backgroundColor: colors.card,
        borderRadius:    borderRadius.xl,
        marginHorizontal: spacing.base,
        padding:         spacing.base,
        ...shadows.sm,
      }]}
    >
      <Text style={[typography.styles.titleSmall, { color: colors.text }]}>
        {t('categoryComparison.title')}
      </Text>
      <Text style={[typography.styles.caption, { color: colors.textSecondary, marginBottom: spacing.sm }]}>
        {t('categoryComparison.subtitle')}
      </Text>

      {changes.map(row => {
        const spentMore = row.delta > 0;
        // Gastar mais é ruim (despesa); gastar menos é bom.
        const tone = spentMore ? colors.expense : colors.income;
        const label = row.percent === null
          ? t('categoryComparison.new')
          : `${spentMore ? '+' : ''}${formatPercent(row.percent * 100, 0)}`;
        return (
          <View
            key={String(row.categoryId)}
            style={[styles.row, { paddingVertical: spacing.sm, borderTopColor: colors.divider }]}
            accessible
            accessibilityLabel={t('categoryComparison.rowA11y', {
              name: row.name,
              current: formatCurrency(row.total),
              previous: formatCurrency(row.previous),
            })}
          >
            <View style={[styles.dot, { backgroundColor: row.color }]} />
            <View style={styles.info}>
              <Text style={[typography.styles.labelLarge, { color: colors.text }]} numberOfLines={1}>
                {row.name}
              </Text>
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]} numberOfLines={1}>
                {t('categoryComparison.fromTo', {
                  previous: formatCurrency(row.previous),
                  current: formatCurrency(row.total),
                })}
              </Text>
            </View>
            <View style={[styles.badge, { backgroundColor: `${tone}1F`, borderRadius: borderRadius.full }]}>
              <Icon name={spentMore ? 'trending-up' : 'trending-down'} size={14} color={tone} />
              <Text style={[typography.styles.labelMedium, { color: tone, marginLeft: 4 }]}>{label}</Text>
            </View>
          </View>
        );
      })}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  card:  {},
  row:   { flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth },
  dot:   { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  info:  { flex: 1, marginRight: 8, minWidth: 0 },
  badge: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8, paddingVertical: 4 },
});
