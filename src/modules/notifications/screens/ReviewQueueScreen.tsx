import React, { useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../../hooks/useTheme';
import { AppHeader } from '../../../components/AppHeader';
import { Icon } from '../../../components/Icon';
import { useSafeBottomPadding } from '../../../hooks/useScreenPadding';
import { useReviewStore } from '../../../store/reviewStore';
import { PendingReview } from '../../../models/types';
import { formatCurrency } from '../../../utils/currency';
import { formatDate } from '../../../utils/date';

export function ReviewQueueScreen({ navigation }: any) {
  const { t } = useTranslation();
  const { colors, spacing, borderRadius, shadows, typography } = useTheme();
  const bottomPad = useSafeBottomPadding(24);
  const pendingReviews = useReviewStore(s => s.pendingReviews);
  const isLoading = useReviewStore(s => s.isLoading);
  const loadPendingReviews = useReviewStore(s => s.loadPendingReviews);

  useFocusEffect(
    useCallback(() => {
      void loadPendingReviews();
    }, [loadPendingReviews]),
  );

  const renderItem = ({ item }: { item: PendingReview }) => {
    const isExpense = item.proposedType === 'expense';
    const amountColor = isExpense ? colors.expense : colors.income;
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => navigation.navigate('ReviewDetail', { reviewId: item.id })}
        style={[{
          backgroundColor: colors.card,
          borderRadius: borderRadius.lg,
          padding: spacing.base,
          marginBottom: spacing.sm,
          ...shadows.sm,
        }]}
      >
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <View style={{ flex: 1, marginRight: spacing.sm }}>
            <Text style={[typography.styles.titleSmall, { color: colors.text }]} numberOfLines={1}>
              {item.proposedDescription}
            </Text>
            <Text style={[typography.styles.bodySmall, { color: colors.textSecondary, marginTop: 2 }]} numberOfLines={1}>
              {item.proposedBankName} · {item.proposedCategory}
            </Text>
            <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]} numberOfLines={2}>
              {item.title}{item.body ? ` · ${item.body}` : ''}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={[typography.styles.titleSmall, { color: amountColor }]}>
              {isExpense ? '−' : '+'}{formatCurrency(Math.abs(item.proposedAmount))}
            </Text>
            <Text style={[typography.styles.caption, { color: colors.textTertiary, marginTop: 4 }]}>
              {formatDate(item.createdAt, 'relative')}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <AppHeader
        title={t('reviewQueue.title')}
        onClose={() => navigation.goBack()}
      />

      <FlatList
        data={pendingReviews}
        keyExtractor={item => String(item.id)}
        contentContainerStyle={{ padding: spacing.base, paddingBottom: bottomPad + 40 }}
        refreshControl={
          <RefreshControl refreshing={isLoading} onRefresh={loadPendingReviews} tintColor={colors.primary} />
        }
        ListEmptyComponent={
          <View style={[styles.empty, {
            backgroundColor: colors.surfaceVariant,
            borderRadius: borderRadius.xl,
            padding: spacing.xl,
          }]}>
            <Icon name="check-circle" size={40} color={colors.textTertiary} style={{ alignSelf: 'center' }} />
            <Text style={[typography.styles.titleSmall, {
              color: colors.text, textAlign: 'center', marginTop: spacing.sm,
            }]}>
              {t('reviewQueue.empty')}
            </Text>
            <Text style={[typography.styles.bodySmall, {
              color: colors.textSecondary, textAlign: 'center', marginTop: spacing.xs,
            }]}>
              {t('reviewQueue.emptyHint')}
            </Text>
          </View>
        }
        renderItem={renderItem}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  empty: { alignItems: 'center' },
});
