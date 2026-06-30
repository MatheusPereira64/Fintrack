import React, { memo, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
} from 'react-native';
import Animated, { FadeInRight } from 'react-native-reanimated';
import { useTheme }        from '../hooks/useTheme';
import { Transaction }     from '../models/types';
import { formatCurrency }  from '../utils/currency';
import { formatDate }      from '../utils/date';
import { useCategoryStore } from '../store/categoryStore';

interface TransactionItemProps {
  transaction: Transaction;
  onPress?:    (t: Transaction) => void;
  showDate?:   boolean;
  index?:      number;
}

export const TransactionItem = memo(function TransactionItem({
  transaction, onPress, showDate = false, index = 0,
}: TransactionItemProps) {
  const { colors, spacing, borderRadius, typography } = useTheme();
  const getCategoryById = useCategoryStore(s => s.getCategoryById);
  const category  = transaction.categoryId ? getCategoryById(transaction.categoryId) : undefined;
  const isIncome  = transaction.amount > 0;
  const amtColor  = isIncome ? colors.income : colors.expense;
  const catIcon   = category?.icon ?? (isIncome ? '📥' : '💸');
  const catColor  = category?.color ?? colors.primary;

  const handlePress = useCallback(() => onPress?.(transaction), [onPress, transaction]);

  return (
    <Animated.View entering={FadeInRight.delay(index * 30).duration(250)}>
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
        {/* Ícone */}
        <View style={[
          styles.iconWrap,
          { backgroundColor: `${catColor}20`, borderRadius: borderRadius.md },
        ]}>
          <Text style={styles.icon}>{catIcon}</Text>
        </View>

        {/* Info */}
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

        {/* Valor */}
        <View style={styles.right}>
          <Text style={[typography.styles.titleSmall, { color: amtColor }]}>
            {isIncome ? '+' : ''}{formatCurrency(transaction.amount)}
          </Text>
          {transaction.sourceNotification && (
            <View style={[styles.autoBadge, { backgroundColor: `${colors.primary}20` }]}>
              <Text style={[typography.styles.caption, { color: colors.primary }]}>auto</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  container:  { flexDirection: 'row', alignItems: 'center' },
  iconWrap:   { width: 44, height: 44, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  icon:       { fontSize: 20 },
  info:       { flex: 1, marginRight: 8 },
  meta:       { flexDirection: 'row', flexWrap: 'wrap', marginTop: 2 },
  right:      { alignItems: 'flex-end', gap: 4 },
  autoBadge:  { borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 },
});
