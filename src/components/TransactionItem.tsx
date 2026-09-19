import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTranslation }  from 'react-i18next';
import { useTheme }        from '../hooks/useTheme';
import { Icon }            from './Icon';
import { Transaction }     from '../models/types';
import { formatCurrency }  from '../utils/currency';
import { formatDate }      from '../utils/date';
import { resolveCategoryIcon } from '../utils/categoryIcon';
import { useCategoryStore } from '../store/categoryStore';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?:    (t: Transaction) => void;
  showDate?:   boolean;
  index?:      number;
  animate?:    boolean;
}

export const TransactionItem = memo(function TransactionItem({
  transaction, onPress, showDate = false, index = 0, animate = false,
}: TransactionItemProps) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, typography } = useTheme();
  const getCategoryById = useCategoryStore(s => s.getCategoryById);
  const category  = transaction.categoryId ? getCategoryById(transaction.categoryId) : undefined;
  const isIncome  = transaction.amount > 0;
  const amtColor  = isIncome ? colors.income : colors.expense;
  const catIcon   = resolveCategoryIcon(category?.name ?? category?.icon, isIncome ? 'income' : 'expense');
  const catColor  = category?.color ?? colors.primary;

  const handlePress = useCallback(() => onPress?.(transaction), [onPress, transaction]);

  const inner = (
    <TouchableOpacity
        onPress={handlePress}
        activeOpacity={0.7}
        style={[
          styles.container,
          {
            backgroundColor: colors.card,
            borderRadius:     borderRadius.lg,
            padding:          spacing.base,
            marginBottom:     spacing.xs,
          },
        ]}
      >
        <View style={[
          styles.iconWrap,
          { backgroundColor: `${catColor}20`, borderRadius: borderRadius.md },
        ]}>
          <Icon name={catIcon} size={20} color={catColor} />
        </View>

        <View style={styles.info}>
          <Text
            style={[typography.styles.titleSmall, { color: colors.text }]}
            numberOfLines={1}
          >
            {transaction.description}
          </Text>
          <View style={styles.meta}>
            {category && (
              <Text style={[typography.styles.caption, { color: colors.textSecondary }]}>
                {category.name}
              </Text>
            )}
            {transaction.bankName && (
              <Text style={[typography.styles.caption, { color: colors.textTertiary }]}>
                {category ? ` · ${transaction.bankName}` : transaction.bankName}
              </Text>
            )}
            {showDate && (
              <Text style={[typography.styles.caption, { color: colors.textTertiary }]}>
                {` · ${formatDate(transaction.date, 'short')}`}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.right}>
          <Text style={[typography.styles.titleSmall, { color: amtColor }]}>
            {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
          </Text>
          {transaction.sourceNotification && (
            <View style={[styles.autoBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[typography.styles.caption, { color: colors.primary }]}>
                {t('transactionItem.auto')}
              </Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
  );

  if (!animate) return inner;

  return (
    <Animated.View entering={FadeInRight.delay(Math.min(index, 6) * 30).duration(250)}>
      {inner}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container:  { flexDirection: 'row', alignItems: 'center' },
  iconWrap:   { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  info:       { flex: 1, marginRight: 8 },
  meta:       { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  right:      { alignItems: 'flex-end', gap: 4 },
  autoBadge:  { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
});
